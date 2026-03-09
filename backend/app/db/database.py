from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import MONGO_URI, DB_NAME
from app.models.user import User
from app.models.dataset import Dataset
from app.models.model import Model
from app.models.blacklisted_token_model import BlacklistedToken

_client: Optional[AsyncIOMotorClient] = None

async def init_db():
    global _client
    _client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(
        database=_client[DB_NAME],
        document_models=[User, Model, Dataset, BlacklistedToken]
    )

async def shutdown_db():
    global _client
    if _client:
        _client.close()

def get_client() -> AsyncIOMotorClient:
    if not _client:
        raise RuntimeError("Mongo client not initialized! Did you forget to call init_db()?")
    return _client