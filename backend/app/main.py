from contextlib import asynccontextmanager
from encodings.rot_13 import rot13

from fastapi import FastAPI
from app.db.database import init_db
from app.core.exception_handlers import register_exception_handlers
from app.api.auth_router import router as auth_router
from app.api.dataset_router import router as dataset_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database...")
    await init_db()
    yield
    print("Database shutdown complete.")


app = FastAPI(title= "MLOps platform" , lifespan=lifespan)
register_exception_handlers(app)
app.include_router(prefix="/api" , router= auth_router)
app.include_router(prefix="/api" , router=dataset_router)
