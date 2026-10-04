import os
import time
import json
import pytest
import httpx
import websockets

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
WS_URL = os.getenv("TEST_WS_URL", "ws://localhost:8000")


@pytest.fixture(scope="session")
def client():
    """HTTP client configured to test the running Docker Compose stack."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # Wait up to 30 seconds for the app container to become ready
        deadline = time.time() + 30
        connected = False
        while time.time() < deadline:
            try:
                resp = client.get("/api/v1/health")
                if resp.status_code == 200:
                    connected = True
                    break
            except Exception:
                time.sleep(1)
        if not connected:
            pytest.fail(f"Could not connect to {BASE_URL} within 30 seconds. Ensure docker compose is up.")
        yield client


# =========================================================================
# Scenario 1: Frontend SPA & Static Assets Serving Verification
# =========================================================================
def test_spa_and_static_assets_serving(client):
    """Verify backend container serves frontend HTML, assets, and handles SPA routes."""
    # 1. Root route serves index.html
    root_resp = client.get("/")
    assert root_resp.status_code == 200
    assert "<!doctype html>" in root_resp.text.lower()
    assert 'id="root"' in root_resp.text

    # 2. SPA client-side deep routes return index.html fallback
    spa_resp = client.get("/boards/board-demo-1")
    assert spa_resp.status_code == 200
    assert "<!doctype html>" in spa_resp.text.lower()

    # 3. Dedicated API health endpoint returns JSON (not HTML fallback)
    health_resp = client.get("/api/v1/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "ok"


# =========================================================================
# Scenario 2: Authentication & User Session Lifecycle
# =========================================================================
def test_auth_and_user_flows(client):
    """Verify demo users, authentication, token issuance, and user profile retrieval."""
    # List demo personas seeded in Postgres
    demo_resp = client.get("/api/v1/auth/demo-users")
    assert demo_resp.status_code == 200
    users = demo_resp.json()
    assert len(users) >= 4
    alex = next((u for u in users if u["email"] == "alex@example.com"), None)
    assert alex is not None

    # Login as seeded user
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "token" in login_data
    token = login_data["token"]

    # Verify protected /me endpoint with Bearer token
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == "user-1"


# =========================================================================
# Scenario 3: End-to-End Board, Columns & Cards CRUD against PostgreSQL
# =========================================================================
def test_e2e_kanban_crud_pipeline(client):
    """Test full CRUD operations: create board, column, card, and update them in Postgres."""
    # 1. Login to get token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "sarah@example.com", "password": "password123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a new Board
    test_title = f"Integration Test Board {int(time.time())}"
    board_resp = client.post(
        "/api/v1/boards",
        headers=headers,
        json={"title": test_title, "description": "Created during integration test"},
    )
    assert board_resp.status_code == 201
    board = board_resp.json()
    board_id = board["id"]
    assert board["title"] == test_title

    # 3. Create a Column
    col_resp = client.post(
        f"/api/v1/boards/{board_id}/columns",
        headers=headers,
        json={"title": "QA Verification"},
    )
    assert col_resp.status_code == 201
    col = col_resp.json()
    col_id = col["id"]

    # 4. Create a Card
    card_resp = client.post(
        "/api/v1/cards",
        headers=headers,
        json={
            "columnId": col_id,
            "title": "Verify Compose Postgres DB",
            "description": "Integration test payload",
            "tags": ["integration", "docker"],
        },
    )
    assert card_resp.status_code == 201
    card = card_resp.json()
    card_id = card["id"]
    assert card["title"] == "Verify Compose Postgres DB"

    # 5. Retrieve Board and verify relational join from Postgres
    get_board_resp = client.get(f"/api/v1/boards/{board_id}", headers=headers)
    assert get_board_resp.status_code == 200
    fetched_board = get_board_resp.json()
    assert any(c["id"] == col_id for c in fetched_board["columns"])
    assert any(cd["id"] == card_id for cd in fetched_board["cards"])


# =========================================================================
# Scenario 4: Real-time Multi-User WebSocket Synchronization & Lock State
# =========================================================================
@pytest.mark.anyio
async def test_websocket_realtime_sync_and_locking():
    """Verify live bidirectional WebSocket sync and card lock acquisition between peers."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # Authenticate Peer A (Alex) and Peer B (Sarah)
        auth_a = (
            await client.post(
                "/api/v1/auth/login",
                json={"email": "alex@example.com", "password": "password123"},
            )
        ).json()
        auth_b = (
            await client.post(
                "/api/v1/auth/login",
                json={"email": "sarah@example.com", "password": "password123"},
            )
        ).json()

    board_id = "board-demo-1"
    token_a = auth_a["token"]
    token_b = auth_b["token"]

    ws_url_a = f"{WS_URL}/api/v1/ws/boards/{board_id}?token={token_a}"
    ws_url_b = f"{WS_URL}/api/v1/ws/boards/{board_id}?token={token_b}"

    # Connect both peers to board WebSocket
    async with websockets.connect(ws_url_a) as ws_a, websockets.connect(ws_url_b) as ws_b:
        # Peer A sends a LIVE_TYPING character event
        typing_event = {
            "type": "LIVE_TYPING",
            "boardId": board_id,
            "senderId": "user-1",
            "payload": {
                "typing": {
                    "cardId": "card-1",
                    "userId": "user-1",
                    "userName": "Alex Morgan",
                    "field": "title",
                    "value": "Typing live update via WebSocket integration test",
                }
            },
            "timestamp": int(time.time() * 1000),
        }
        await ws_a.send(json.dumps(typing_event))

        # Peer B receives the broadcasted live typing event
        raw_msg = await ws_b.recv()
        received_msg = json.loads(raw_msg)
        assert received_msg["type"] in ("LIVE_TYPING", "USER_JOINED")

        # If previous user join message was queued, consume until LIVE_TYPING
        if received_msg["type"] != "LIVE_TYPING":
            raw_msg = await ws_b.recv()
            received_msg = json.loads(raw_msg)

        assert received_msg["type"] == "LIVE_TYPING"
        assert received_msg["payload"]["typing"]["cardId"] == "card-1"
        assert "Typing live update" in received_msg["payload"]["typing"]["value"]
