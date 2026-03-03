"""
BlacklistedToken model — stores revoked JWT identifiers.

A TTL index on ``expires_at`` ensures MongoDB automatically removes
entries once the original token would have expired, keeping the
collection lean without manual cleanup.
"""

from datetime import datetime

from beanie import Document
from pymongo import IndexModel


class BlacklistedToken(Document):
    """Represents a single revoked JWT, identified by its ``jti`` claim."""

    jti: str
    expires_at: datetime

    class Settings:
        name = "blacklisted_tokens"
        indexes = [
            # Unique index on jti — prevents duplicate blacklist entries
            IndexModel("jti", unique=True),
            # TTL index — MongoDB deletes the document once expires_at is reached
            IndexModel("expires_at", expireAfterSeconds=0),
        ]
