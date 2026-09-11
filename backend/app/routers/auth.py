from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    create_access_token,
    get_current_user,
    verify_password,
)
from app.models import (
    AuthResponse,
    LoginRequest,
    SwitchUserRequest,
    User,
)
from app.store import store

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user_db = store.get_user_in_db_by_email(req.email)
    if not user_db:
        # Auto-create user if not found
        user = store.create_user(email=req.email, name=req.name, password=req.password)
    else:
        # If password was supplied, verify it
        if req.password and not verify_password(req.password, user_db.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password",
            )
        user = User(**user_db.model_dump())

    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(user=user, token=token)

@router.get("/me", response_model=User)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: User = Depends(get_current_user)):
    return None

@router.get("/demo-users", response_model=List[User])
def get_demo_users():
    return store.list_demo_users()

@router.post("/switch-user", response_model=AuthResponse)
def switch_user(req: SwitchUserRequest):
    user = store.get_user(req.userId)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {req.userId} not found",
        )
    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(user=user, token=token)
