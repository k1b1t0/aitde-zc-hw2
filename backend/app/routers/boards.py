from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.models import (
    Board,
    CreateBoardRequest,
    InviteUrlResponse,
    User,
)
from app.store import store

router = APIRouter(tags=["Boards"])

@router.get("/boards", response_model=List[Board])
def list_boards(current_user: User = Depends(get_current_user)):
    return store.list_boards(current_user.id)

@router.post("/boards", response_model=Board, status_code=status.HTTP_201_CREATED)
def create_board(req: CreateBoardRequest, current_user: User = Depends(get_current_user)):
    return store.create_board(req.title, req.description, current_user)

@router.get("/boards/{board_id}", response_model=Board)
def get_board(board_id: str, current_user: User = Depends(get_current_user)):
    board = store.get_board(board_id, user=current_user)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Board {board_id} not found",
        )
    return board

@router.get("/boards/{board_id}/invite-url", response_model=InviteUrlResponse)
def get_invite_url(board_id: str, current_user: User = Depends(get_current_user)):
    board = store.get_board(board_id)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Board {board_id} not found",
        )
    url = f"http://localhost:5173/join/{board.inviteToken}"
    return InviteUrlResponse(inviteUrl=url, inviteToken=board.inviteToken)

@router.post("/boards/join/{token}", response_model=Board)
def join_board_by_token(token: str, current_user: User = Depends(get_current_user)):
    board = store.join_board_by_token(token, current_user)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite link or token",
        )
    return board
