import time
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.models import (
    Card,
    CreateCardRequest,
    MoveCardRequest,
    UpdateCardRequest,
    User,
    WebSocketMessage,
)
from app.store import store

router = APIRouter(tags=["Cards"])

@router.post("/cards", response_model=Card, status_code=status.HTTP_201_CREATED)
async def create_card(req: CreateCardRequest, current_user: User = Depends(get_current_user)):
    result = store.create_card(
        column_id=req.columnId,
        title=req.title,
        description=req.description or "",
        assignee_id=req.assigneeId or current_user.id,
        tags=req.tags or ["feature"],
        due_date=req.dueDate,
        order=req.order,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target column not found on any board",
        )
    card, board_id = result

    # Broadcast to peers
    msg = WebSocketMessage(
        type="CARD_CREATED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"card": card.model_dump()},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return card

@router.put("/cards/{card_id}", response_model=Card)
async def update_card(card_id: str, req: UpdateCardRequest, current_user: User = Depends(get_current_user)):
    updates = req.model_dump(exclude_unset=True)
    result = store.update_card(card_id, updates)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} not found",
        )
    card, board_id = result

    # Broadcast to peers
    msg = WebSocketMessage(
        type="CARD_UPDATED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"card": card.model_dump()},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return card

@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(card_id: str, current_user: User = Depends(get_current_user)):
    board_id = store.delete_card(card_id)
    if not board_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} not found",
        )

    # Broadcast deletion and unlock
    del_msg = WebSocketMessage(
        type="CARD_DELETED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"cardId": card_id},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, del_msg)

    unlock_msg = WebSocketMessage(
        type="CARD_UNLOCKED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"cardId": card_id},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, unlock_msg)

    return None

@router.post("/cards/{card_id}/move", response_model=Card)
async def move_card(card_id: str, req: MoveCardRequest, current_user: User = Depends(get_current_user)):
    result = store.move_card(card_id, req.targetColumnId, req.newOrder)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} not found",
        )
    card, board_id = result

    # Broadcast movement
    msg = WebSocketMessage(
        type="CARD_MOVED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"cardId": card_id, "targetColumnId": req.targetColumnId, "newOrder": req.newOrder},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return card
