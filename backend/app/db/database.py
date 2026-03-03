from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import MONGO_URI , DB_NAME
from app.models.user_model import User
from app.models.blacklisted_token_model import BlacklistedToken

async def init_db():
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(
        database=client[DB_NAME],
        document_models=[User, BlacklistedToken]
    )

