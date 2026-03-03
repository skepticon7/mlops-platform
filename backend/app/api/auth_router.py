"""
Authentication router — handles registration, login, logout, and protected endpoints.

Routes:
    POST /api/auth/register      → create a new user account
    POST /api/auth/login         → authenticate and receive a JWT
    POST /api/auth/logout        → revoke the current JWT (protected)
    GET  /api/auth/get_user/{id} → fetch any user by ID
    GET  /api/auth/me            → return the currently authenticated user (protected)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from jose import jwt

from app.core.config import SECRET_KEY
from app.core.security import (
    ALGORITHM,
    create_access_token,
    get_current_user,
    oauth2_scheme,
)
from app.models.blacklisted_token_model import BlacklistedToken
from app.models.user_model import User
from app.schemas.auth_schema import LoginRequest, TokenResponse
from app.schemas.user_schema import UserResponse, UserCreate
from app.services.user_service import (
    create_user,
    get_user_by_id,
    authenticate_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ──────────────────────────────────────────────────────────────────────────────
# Public endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """
    Register a new user.

    Raises 400 if the email is already taken or validation fails.
    """
    return await create_user(user_data)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """
    Authenticate a user and return a JWT access token with user info.

    Steps:
        1. Validate email + password via the service layer.
        2. Generate a signed JWT with the user's ID as the ``sub`` claim.
        3. Return the token alongside the user's ``id`` and ``email``.

    Raises 401 if the credentials are invalid.
    """
    # authenticate_user raises UnauthorizedException on failure
    user = await authenticate_user(credentials.email, credentials.password)

    # Encode the user's MongoDB ObjectId as the token subject
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email })

    return TokenResponse(
        access_token=access_token,
        id=str(user.id),
        email=user.email,
    )


@router.get("/get_user/{id}", response_model=UserResponse)
async def get_user(id: str):
    """Fetch a user by their MongoDB ObjectId (public)."""
    return await get_user_by_id(id)


# ──────────────────────────────────────────────────────────────────────────────
# Protected endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Return the profile of the currently authenticated user.

    Requires a valid ``Authorization: Bearer <token>`` header.
    The ``get_current_user`` dependency decodes the JWT, resolves the user
    from the database, and injects it here.
    """
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    _current_user: User = Depends(get_current_user),
):
    """
    Revoke the current access token by adding its ``jti`` to the blacklist.

    The token is decoded to extract:
        - ``jti`` — the unique token identifier to blacklist.
        - ``exp`` — the original expiry so MongoDB's TTL index can auto-clean
          the entry once it's no longer relevant.

    Subsequent requests with this token will be rejected by the
    ``get_current_user`` dependency.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    jti: str = payload["jti"]
    # Convert the UNIX timestamp to a datetime for the TTL index
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    await BlacklistedToken(jti=jti, expires_at=expires_at).insert()

    return {"message": "Successfully logged out"}
