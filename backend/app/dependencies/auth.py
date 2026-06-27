"""JWT auth dependencies (NFR-08).

Dispatcher/admin and driver views require a bearer token; the resident QR
report form stays unauthenticated by design. `require_roles(...)` builds a
dependency that both validates the token and enforces role membership, so the
same machinery serves driver, dispatcher, and admin routes.
"""
import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_ALGORITHM = "HS256"

# NFR-08 enforcement toggle. The bundled frontend has no login screen yet, so
# enforcement is opt-in: set AUTH_REQUIRED=true once a login flow is wired.
# The login endpoint, /me, and role machinery are always live regardless.
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() == "true"

# auto_error=False so we can return a clean 401 with a useful message.
_bearer = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    id: Optional[int] = None
    role: str
    truck_id: Optional[int] = None


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> CurrentUser:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    return CurrentUser(
        id=payload.get("sub"),
        role=payload.get("role", ""),
        truck_id=payload.get("truck_id"),
    )


def require_roles(*allowed: str):
    """Dependency factory: require a valid token whose role is in `allowed`.

    Admin is always permitted (superset role). When AUTH_REQUIRED is false the
    dependency is a no-op (returns None) so the tokenless frontend keeps working;
    flip AUTH_REQUIRED=true to enforce. Example:
        Depends(require_roles("dispatcher", "admin"))
        Depends(require_roles("driver"))
    """
    allowed_set = set(allowed) | {"admin"}

    def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not allowed for this resource",
            )
        return user

    async def _noop() -> None:
        return None

    return _dep if AUTH_REQUIRED else _noop
