from contextlib import asynccontextmanager

from fastapi import FastAPI
from app.db.database import init_db
from app.core.exception_handlers import register_exception_handlers
from app.api.auth_router import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database...")
    await init_db()
    yield
    print("Database shutdown complete.")


app = FastAPI(title= "MLOps platform" , lifespan=lifespan)
register_exception_handlers(app)
app.include_router(auth_router)
