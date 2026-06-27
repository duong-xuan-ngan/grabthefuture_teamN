from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import User
from app.dependencies.auth import (
    JWT_SECRET, JWT_ALGORITHM, get_current_user, CurrentUser,
)

router = APIRouter()

JWT_EXPIRY_HOURS = 24


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "driver"   # resident users register as "driver" by default


@router.post("/register", status_code=201)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    # Only allow resident-facing roles to self-register; admin is seed-only.
    allowed_roles = {"driver", "dispatcher"}
    if body.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(allowed_roles)}")

    if len(body.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = session.exec(select(User).where(User.username == body.username.strip())).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(username=body.username.strip(), password=hashed, role=body.role)
    session.add(user)
    session.commit()
    session.refresh(user)

    payload = {
        "sub":             user.id,
        "role":            user.role,
        "truck_id":        user.truck_id,
        "waste_point_id":  user.waste_point_id,
        "exp":             datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token, "role": user.role, "truck_id": user.truck_id, "waste_point_id": user.waste_point_id}


@router.post("/login")
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == body.username)).first()
    if not user or not bcrypt.checkpw(body.password.encode(), user.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    payload = {
        "sub":             user.id,
        "role":            user.role,
        "truck_id":        user.truck_id,
        "waste_point_id":  user.waste_point_id,
        "exp":             datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token, "role": user.role, "truck_id": user.truck_id, "waste_point_id": user.waste_point_id}


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    """Return the identity encoded in the bearer token."""
    return {"id": user.id, "role": user.role, "truck_id": user.truck_id, "waste_point_id": getattr(user, "waste_point_id", None)}
