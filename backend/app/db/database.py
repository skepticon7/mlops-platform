from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import MONGO_URI , DB_NAME
from app.models.user import User
from app.models.dataset import Dataset
from app.models.model import Model
from app.models.blacklisted_token_model import BlacklistedToken

async def init_db():
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(
        database=client[DB_NAME],
        document_models=[User, Model , Dataset ,BlacklistedToken]
    )

