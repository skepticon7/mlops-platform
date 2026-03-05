"""
Security utilities for the MLOps Platform backend.

Responsibilities:
    1. Password hashing & verification  (bcrypt)
    2. JWT creation                     (python-jose / HS256)
    3. Token-based user resolution      (FastAPI dependency)
"""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from beanie import PydanticObjectId
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.exceptions import UnauthorizedException

# ── OAuth2 scheme ─────────────────────────────────────────────────────────────
# tokenUrl tells Swagger UI where to send credentials for "Authorize".
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ── JWT constants ─────────────────────────────────────────────────────────────
ALGORITHM = "HS256"


# ──────────────────────────────────────────────────────────────────────────────
# Password utilities
# ──────────────────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# JWT utilities
# ──────────────────────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """
    Create a signed JWT containing *data* plus expiration and jti claims.

    The token expires after ACCESS_TOKEN_EXPIRE_MINUTES (default 10 min).
    A unique ``jti`` (JWT ID) is embedded so individual tokens can be
    revoked via the blacklist.
    The ``sub`` field should carry the user identifier (e.g. user ID as str).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4()),  # unique token identifier for blacklist
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI dependency – resolves the current authenticated user
# ──────────────────────────────────────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Decode the bearer token, verify it hasn't been blacklisted, look up
    the user in MongoDB, and return the Beanie ``User`` document.

    Raises ``UnauthorizedException`` if the token is invalid, expired,
    blacklisted, or the referenced user no longer exists.
    """
    # Lazy imports to avoid circular dependencies
    from app.models.user import User
    from app.models.blacklisted_token_model import BlacklistedToken

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        if user_id is None:
            raise UnauthorizedException("Token payload is missing 'sub' claim")
    except JWTError:
        raise UnauthorizedException("Could not validate token")

    # ── Check the blacklist ───────────────────────────────────────────────
    if jti and await BlacklistedToken.find_one(BlacklistedToken.jti == jti):
        raise UnauthorizedException("Token has been revoked")

    # ── Resolve the user ──────────────────────────────────────────────────
    user = await User.get(PydanticObjectId(user_id))
    if user is None:
        raise UnauthorizedException("User not found")

    return user