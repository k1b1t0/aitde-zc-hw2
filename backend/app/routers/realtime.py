import json
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from app.auth import decode_token, get_current_user
from app.models import (
    AcquireLockResponse,
    CardLock,
    User,
    WebSocketMessage,
)
from app.store import store

router = APIRouter(tags=["Realtime"])

@router.get("/boards/{board_id}/locks", response_model=List[CardLock])
def get_card_locks(board_id: str, current_user: User = Depends(get_current_user)):
    return store.get_board_locks(board_id)

@router.post("/boards/{board_id}/cards/{card_id}/lock", response_model=AcquireLockResponse)
async def acquire_card_lock(board_id: str, card_id: str, current_user: User = Depends(get_current_user)):
    acquired = store.acquire_lock(board_id, card_id, current_user)
    lock = next((l for l in store.get_board_locks(board_id) if l.cardId == card_id), None)
    if acquired and lock:
        msg = WebSocketMessage(
            type="CARD_LOCKED",
            boardId=board_id,
            senderId=current_user.id,
            payload={"lock": lock.model_dump()},
            timestamp=int(time.time() * 1000),
        )
        await store.broadcast_to_board(board_id, msg)
    return AcquireLockResponse(acquired=acquired, lock=lock)

@router.delete("/boards/{board_id}/cards/{card_id}/lock", status_code=status.HTTP_204_NO_CONTENT)
async def release_card_lock(board_id: str, card_id: str, current_user: User = Depends(get_current_user)):
    store.release_lock(board_id, card_id)
    msg = WebSocketMessage(
        type="CARD_UNLOCKED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"cardId": card_id},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return None

@router.websocket("/ws/boards/{board_id}")
async def board_websocket(websocket: WebSocket, board_id: str, token: str = Query(...)):
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = store.get_user(payload["sub"])
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    store.add_connection(board_id, websocket)

    # Broadcast user joined
    join_msg = WebSocketMessage(
        type="USER_JOINED",
        boardId=board_id,
        senderId=user.id,
        payload={"user": user.model_dump()},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, join_msg)

    try:
        while True:
            data = await websocket.receive_text()
            msg_dict = json.loads(data)
            ws_msg = WebSocketMessage(**msg_dict)
            # Update sender in case client sent it
            ws_msg.senderId = user.id
            # Forward / broadcast incoming events (e.g. LIVE_TYPING) to room peers
            await store.broadcast_to_board(board_id, ws_msg)
    except WebSocketDisconnect:
        store.remove_connection(board_id, websocket)
        leave_msg = WebSocketMessage(
            type="USER_LEFT",
            boardId=board_id,
            senderId=user.id,
            payload={"userId": user.id},
            timestamp=int(time.time() * 1000),
        )
        await store.broadcast_to_board(board_id, leave_msg)
    except Exception:
        store.remove_connection(board_id, websocket)
