from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.models import (
    Card,
    CreateCardRequest,
    MoveCardRequest,
    UpdateCardRequest,
    User,
)
from app.store import store

router = APIRouter(tags=["Cards"])

@router.post("/cards", response_model=Card, status_code=status.HTTP_201_CREATED)
def create_card(req: CreateCardRequest, current_user: User = Depends(get_current_user)):
    card = store.create_card(
        column_id=req.columnId,
        title=req.title,
        description=req.description or "",
        assignee_id=req.assigneeId or current_user.id,
        tags=req.tags or ["feature"],
        due_date=req.dueDate,
        order=req.order,
    )
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target column not found on any board",
        )
    return card

@router.put("/cards/{card_id}", response_model=Card)
def update_card(card_id: str, req: UpdateCardRequest, current_user: User = Depends(get_current_user)):
    updates = req.model_dump(exclude_unset=True)
    card = store.update_card(card_id, updates)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} not found",
        )
    return card

@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: str, current_user: User = Depends(get_current_user)):
    success = store.delete_card(card_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} not found",
        )
    return None

@router.post("/cards/{card_id}/move", response_model=Card)
def move_card(card_id: str, req: MoveCardRequest, current_user: User = Depends(get_current_user)):
    card = store.move_card(card_id, req.targetColumnId, req.newOrder)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} not found",
        )
    return card
