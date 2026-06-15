
from typing import List
from fastapi import APIRouter, Form, UploadFile, File, Depends, Query, Body
import json
import logging

from starlette import status
from celery.result import AsyncResult

from app.models.user import User
from app.core.security import get_current_user
from app.schemas.model_schema import (
    ModelCreate,
    ModelResponse,
    ModelsPageResponse,
    ModelPaginationResponse,
    ModelDetailsResponse,
    PredictResponse,
    PredictRequest,
)
from app.services.model_service import ModelService
from app.services.training_service import TrainingService
from app.core.celery_app import celery_app

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/model", tags=["model"])


@router.post("/train")
async def train_model(
    file: UploadFile = File(...),
    config_json : str = Form(...),
    user: User = Depends(get_current_user)
):
    config_dict = json.loads(config_json)
    model_schema = ModelCreate(**config_dict)

    result = await TrainingService.start_training(file, model_schema, user)
    return result


@router.get("/getModels" , response_model=ModelPaginationResponse)
async def get_models(
        user:User = Depends(get_current_user),
        page : int = Query(default=1 ,ge=1),
):
    models = await ModelService.get_models(user , page)
    return models

@router.get("/completedModels", response_model=List[ModelsPageResponse])
async def get_completed_models(
        user: User = Depends(get_current_user)
):
    models = await ModelService.get_completed_models(user)
    return models

@router.delete("/deleteModel/{model_id}" , status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
        model_id : str,
        user : User = Depends(get_current_user)
):
    await ModelService.delete_model(model_id , user)


@router.get("/task/{task_id}")
async def get_task_status(
        task_id: str,
        user: User = Depends(get_current_user)
):
    """Get the status of a Celery task"""
    task = AsyncResult(task_id, app=celery_app)

    logger.info(f"Task {task_id} state: {task.state}, info: {task.info}")

    response = {
        "task_id": task_id,
        "state": task.state,  # Changed from 'status' to 'state' for consistency
    }

    if task.state == "PENDING":
        response["progress"] = 0
        response["message"] = "Task is pending"
    elif task.state == "PROGRESS":
        response["progress"] = task.info.get("progress", 0)
        response["message"] = task.info.get("status", "Processing")
    elif task.state == "SUCCESS":
        response["progress"] = 100
        response["message"] = "Training completed"
        response["result"] = task.result
    elif task.state == "FAILURE":
        response["progress"] = 0
        response["message"] = "Training failed"
        response["error"] = str(task.info)
    else:
        # Handle any other states
        response["progress"] = 50
        response["message"] = f"Unknown state: {task.state}"

    return response


@router.get("/getModel/{model_id}", response_model=ModelDetailsResponse)
async def get_model(
        model_id: str,
        user: User = Depends(get_current_user),
):
    model = await ModelService.get_model(model_id, user)
    return model


@router.post("/predict/{model_id}", response_model=PredictResponse)
async def predict(
        model_id: str,
        predict_request: PredictRequest = Body(...),
        user: User = Depends(get_current_user),
):
    prediction = ModelService.predict(model_id, predict_request)

    # Log the prediction in MongoDB for dashboard volume tracking
    try:
        from app.db.database import get_client
        from app.core.config import DB_NAME
        from datetime import datetime, timezone
        from beanie import PydanticObjectId
        client = get_client()
        db = client[DB_NAME]
        await db["prediction_logs"].insert_one({
            "user_id": user.id,
            "model_id": PydanticObjectId(model_id),
            "timestamp": datetime.now(timezone.utc)
        })
    except Exception as e:
        # Prevent logging failure from affecting the prediction output
        logger.error(f"Failed to log prediction: {e}")

    return prediction
