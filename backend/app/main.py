from contextlib import asynccontextmanager
from encodings.rot_13 import rot13

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.db.database import init_db
from app.core.exception_handlers import register_exception_handlers
from app.api.auth_router import router as auth_router
from app.api.dataset_router import router as dataset_router
from app.api.model_router import router as model_router
import logging

logging.basicConfig(
    level=logging.INFO,  # Show INFO and above
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database...")
    await init_db()
    yield
    print("Database shutdown complete.")


app = FastAPI(title= "MLOps platform" , lifespan=lifespan)

app.mount("/datasets" , StaticFiles(directory="app/storage/datasets") , name="datasets")

register_exception_handlers(app)
app.include_router(prefix="/api" , router= auth_router)
app.include_router(prefix="/api" , router=dataset_router)
app.include_router(prefix="/api" , router=model_router)
