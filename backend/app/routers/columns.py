import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.models import (
    Column,
    CreateColumnRequest,
    ReorderColumnsRequest,
    UpdateColumnRequest,
    User,
    WebSocketMessage,
)
from app.store import store

router = APIRouter(tags=["Columns"])

@router.post("/boards/{board_id}/columns", response_model=Column, status_code=status.HTTP_201_CREATED)
async def create_column(board_id: str, req: CreateColumnRequest, current_user: User = Depends(get_current_user)):
    col = store.create_column(board_id, req.title)
    if not col:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Board {board_id} not found",
        )
    msg = WebSocketMessage(
        type="COLUMN_CREATED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"column": col.model_dump()},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return col

@router.put("/columns/{column_id}", response_model=Column)
async def update_column(column_id: str, req: UpdateColumnRequest, current_user: User = Depends(get_current_user)):
    result = store.update_column(column_id, req.title)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Column {column_id} not found",
        )
    col, board_id = result
    msg = WebSocketMessage(
        type="COLUMN_UPDATED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"column": col.model_dump()},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return col

@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(column_id: str, current_user: User = Depends(get_current_user)):
    board_id = store.delete_column(column_id)
    if not board_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Column {column_id} not found",
        )
    msg = WebSocketMessage(
        type="COLUMN_DELETED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"columnId": column_id},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return None

@router.put("/boards/{board_id}/columns/reorder", response_model=List[Column])
async def reorder_columns(board_id: str, req: ReorderColumnsRequest, current_user: User = Depends(get_current_user)):
    cols = store.reorder_columns(board_id, req.columnIds)
    if cols is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Board {board_id} not found",
        )
    msg = WebSocketMessage(
        type="COLUMN_REORDERED",
        boardId=board_id,
        senderId=current_user.id,
        payload={"columnIds": req.columnIds},
        timestamp=int(time.time() * 1000),
    )
    await store.broadcast_to_board(board_id, msg)
    return cols
