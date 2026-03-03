"""
Authentication request/response schemas.

- LoginRequest  : incoming credentials for the /login endpoint.
- TokenResponse : the JWT payload returned to the client.
"""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Schema for user login — expects email + password."""

    email: EmailStr
    password: str = Field(min_length=1, description="User's plaintext password")


class TokenResponse(BaseModel):
    """
    OAuth2-compatible token response, enriched with user info.

    Example:
        {
            "access_token": "<jwt>",
            "token_type": "bearer",
            "id": "664f...",
            "email": "user@example.com"
        }
    """

    access_token: str
    token_type: str = "bearer"
    id: str
    email: str
