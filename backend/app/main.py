from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.core.exception_handlers import register_exception_handlers
from app.api.auth_router import router as auth_router
from app.api.dataset_router import router as dataset_router
from app.api.model_router import router as model_router
from app.api.analytics_router import router as analytics_router
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


app = FastAPI(title= "MLOps platform" , lifespan=lifespan , debug=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



register_exception_handlers(app)
app.include_router(prefix="/api" , router= auth_router)
app.include_router(prefix="/api" , router=dataset_router)
app.include_router(prefix="/api" , router=model_router)
app.include_router(prefix="/api" , router=analytics_router)
