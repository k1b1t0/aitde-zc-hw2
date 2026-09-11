from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.models import (
    Column,
    CreateColumnRequest,
    ReorderColumnsRequest,
    UpdateColumnRequest,
    User,
)
from app.store import store

router = APIRouter(tags=["Columns"])

@router.post("/boards/{board_id}/columns", response_model=Column, status_code=status.HTTP_201_CREATED)
def create_column(board_id: str, req: CreateColumnRequest, current_user: User = Depends(get_current_user)):
    col = store.create_column(board_id, req.title)
    if not col:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Board {board_id} not found",
        )
    return col

@router.put("/columns/{column_id}", response_model=Column)
def update_column(column_id: str, req: UpdateColumnRequest, current_user: User = Depends(get_current_user)):
    col = store.update_column(column_id, req.title)
    if not col:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Column {column_id} not found",
        )
    return col

@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(column_id: str, current_user: User = Depends(get_current_user)):
    success = store.delete_column(column_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Column {column_id} not found",
        )
    return None

@router.put("/boards/{board_id}/columns/reorder", response_model=List[Column])
def reorder_columns(board_id: str, req: ReorderColumnsRequest, current_user: User = Depends(get_current_user)):
    cols = store.reorder_columns(board_id, req.columnIds)
    if cols is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Board {board_id} not found",
        )
    return cols
