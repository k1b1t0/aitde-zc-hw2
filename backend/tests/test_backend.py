import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_header():
    # Login as seed demo user Alex Morgan
    resp = client.post("/api/v1/auth/login", json={"email": "alex@example.com", "password": "password123"})
    assert resp.status_code == 200
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_health_check():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

def test_auth_flow(auth_header):
    # Test /auth/me
    resp = client.get("/api/v1/auth/me", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "alex@example.com"
    assert data["name"] == "Alex Morgan"

    # Test /auth/demo-users
    resp = client.get("/api/v1/auth/demo-users")
    assert resp.status_code == 200
    demo_users = resp.json()
    assert len(demo_users) >= 4

    # Test /auth/switch-user
    resp = client.post("/api/v1/auth/switch-user", json={"userId": "user-2"})
    assert resp.status_code == 200
    switch_data = resp.json()
    assert switch_data["user"]["id"] == "user-2"
    assert "token" in switch_data

def test_auth_unauthorized():
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401

    resp = client.get("/api/v1/boards")
    assert resp.status_code == 401

def test_boards_flow(auth_header):
    # List seeded boards
    resp = client.get("/api/v1/boards", headers=auth_header)
    assert resp.status_code == 200
    boards = resp.json()
    assert len(boards) > 0
    demo_board = boards[0]
    assert demo_board["id"] == "board-demo-1"

    # Get single board
    resp = client.get(f"/api/v1/boards/{demo_board['id']}", headers=auth_header)
    assert resp.status_code == 200
    board_data = resp.json()
    assert len(board_data["columns"]) == 4
    assert len(board_data["cards"]) >= 5

    # Get invite url
    resp = client.get(f"/api/v1/boards/{demo_board['id']}/invite-url", headers=auth_header)
    assert resp.status_code == 200
    invite = resp.json()
    assert "inviteUrl" in invite
    assert invite["inviteToken"] == "invite-collab-xyz"

    # Create new board
    resp = client.post(
        "/api/v1/boards",
        headers=auth_header,
        json={"title": "Q4 Strategy Board", "description": "High level strategy"},
    )
    assert resp.status_code == 201
    new_b = resp.json()
    assert new_b["title"] == "Q4 Strategy Board"
    assert len(new_b["columns"]) == 3

def test_columns_and_cards_flow(auth_header):
    # 1. Create Column
    resp = client.post(
        "/api/v1/boards/board-demo-1/columns",
        headers=auth_header,
        json={"title": "Backlog Test"},
    )
    assert resp.status_code == 201
    col = resp.json()
    col_id = col["id"]
    assert col["title"] == "Backlog Test"

    # 2. Rename Column
    resp = client.put(
        f"/api/v1/columns/{col_id}",
        headers=auth_header,
        json={"title": "Prioritized Backlog"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Prioritized Backlog"

    # 3. Create Card in that Column
    resp = client.post(
        "/api/v1/cards",
        headers=auth_header,
        json={
            "columnId": col_id,
            "title": "Backend integration tests",
            "description": "Ensure endpoints meet openapi.yaml",
            "tags": ["feature", "urgent"],
            "dueDate": "2026-09-30",
        },
    )
    assert resp.status_code == 201
    card = resp.json()
    card_id = card["id"]
    assert card["title"] == "Backend integration tests"

    # 4. Update Card
    resp = client.put(
        f"/api/v1/cards/{card_id}",
        headers=auth_header,
        json={"title": "Updated backend test title"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated backend test title"

    # 5. Move Card to col-2
    resp = client.post(
        f"/api/v1/cards/{card_id}/move",
        headers=auth_header,
        json={"targetColumnId": "col-2", "newOrder": 0},
    )
    assert resp.status_code == 200
    assert resp.json()["columnId"] == "col-2"

    # 6. Delete Card
    resp = client.delete(f"/api/v1/cards/{card_id}", headers=auth_header)
    assert resp.status_code == 204

    # 7. Delete Column
    resp = client.delete(f"/api/v1/columns/{col_id}", headers=auth_header)
    assert resp.status_code == 204

def test_card_lock_and_websocket_connection(auth_header):
    # Lock card
    resp = client.post(
        "/api/v1/boards/board-demo-1/cards/card-1/lock",
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["acquired"] is True

    # List locks
    resp = client.get("/api/v1/boards/board-demo-1/locks", headers=auth_header)
    assert resp.status_code == 200
    locks = resp.json()
    assert any(l["cardId"] == "card-1" for l in locks)

    # Release lock
    resp = client.delete("/api/v1/boards/board-demo-1/cards/card-1/lock", headers=auth_header)
    assert resp.status_code == 204

    # Test WebSocket connection with token query param
    token = auth_header["Authorization"].split(" ")[1]
    with client.websocket_connect(f"/api/v1/ws/boards/board-demo-1?token={token}") as websocket:
        # Should receive USER_JOINED message on connect
        data = websocket.receive_json()
        assert data["type"] == "USER_JOINED"
        assert data["boardId"] == "board-demo-1"
