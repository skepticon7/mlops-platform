from fastapi import APIRouter, Form, UploadFile, File, Depends
import json
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.model_schema import ModelCreate, ModelResponse, ModelsPageResponse
from app.services.model_service import ModelService
from app.services.training_service import TrainingService

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


@router.get("/getModels" , response_model=list[ModelsPageResponse])
async def get_models(
        user:User = Depends(get_current_user),
):
    models = await ModelService.get_models(user)
    return models
