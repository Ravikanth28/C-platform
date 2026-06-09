import random
import string
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from database import get_db

router = APIRouter()

AVATAR_COLORS = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
    "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
]


@router.post("/register", response_model=schemas.Token, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role=payload.role if payload.role in ("admin", "student") else "student",
        avatar_color=random.choice(AVATAR_COLORS),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(
        access_token=token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user),
    )


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.username == payload.username)
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(
        access_token=token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserResponse)
async def me(current_user: models.User = Depends(get_current_user)):
    return current_user
