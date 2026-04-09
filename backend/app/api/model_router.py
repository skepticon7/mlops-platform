
from fastapi import APIRouter, Form, UploadFile, File, Depends , Query
import json

from starlette import status

from app.models.user import User
from app.core.security import get_current_user
from app.schemas.model_schema import ModelCreate, ModelResponse, ModelsPageResponse, ModelPaginationResponse, \
    ModelDetailsResponse
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


@router.get("/getModels" , response_model=ModelPaginationResponse)
async def get_models(
        user:User = Depends(get_current_user),
        page : int = Query(default=1 ,ge=1),
):
    models = await ModelService.get_models(user , page)
    return models

@router.delete("/deleteModel/{model_id}" , status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
        model_id : str,
        user : User = Depends(get_current_user)
):
    await ModelService.delete_model(model_id , user)

@router.get("/getModel/{model_id}" , response_model=ModelDetailsResponse)
async def get_model(
        model_id : str,
        user: User = Depends(get_current_user),
):
    model = await ModelService.get_model(model_id , user)
    return model