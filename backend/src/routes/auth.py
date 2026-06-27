# src/routes/auth.py
# BE Dev 1 owns this file.

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
import bcrypt
from jose import jwt

from src.config import settings
from src.middleware.auth import get_current_user
from src.models.schemas import LoginRequest, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _create_token(user_id: str, role: str, name: str | None) -> str:
    """Sign a JWT with user identity and expiry."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub":  user_id,
        "role": role,
        "name": name,
        "exp":  expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest):
    """
    Authenticate with email + password.
    Returns a signed JWT on success.
    """
    # TODO:
    #   user = await user_service.get_by_email(body.email)
    #   if not user or not bcrypt.checkpw(body.password.encode(), user["password"].encode()):
    #       raise HTTPException(401, "Invalid credentials")
    #   token = _create_token(str(user["id"]), user["role"], user["name"])
    #   return TokenOut(access_token=token, role=user["role"], name=user["name"])
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's identity from the token."""
    return {"id": user.get("sub"), "role": user.get("role"), "name": user.get("name")}
