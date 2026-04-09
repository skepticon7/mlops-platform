from beanie import PydanticObjectId
from pydantic import BaseModel , Field
from datetime import datetime
from app.models.model import Algorithm, TaskType, ModelStatus
from typing import Optional, List, Dict


class ModelCreate(BaseModel):
    name : str = Field(... , min_length=1 , max_length=50)
    algorithm : Algorithm
    task_type : TaskType
    target_column : Optional[str] = None
    hyperparams : Optional[dict] = None



class ModelResponse(BaseModel):
    id : str
    user_id : str
    dataset_id : str
    name : str
    algorithm : Algorithm
    task_type : TaskType
    target_column : Optional[str]
    features : List[str]
    hyperparams : Optional[dict] = None
    metrics : Dict
    file_path : str
    status : ModelStatus
    created_at : datetime
    updated_at : datetime | None = None


class ModelsPageResponse(BaseModel):
    id : str
    name : str
    algorithm : Algorithm
    accuracy : Optional[float] = None
    status : ModelStatus
    created_at : datetime


class ModelPaginationResponse(BaseModel):
    models : list[ModelsPageResponse]
    total_pages : int
    total : int
    page : int


class ModelDetailsResponse(BaseModel):
    id: str
    name: str
    algorithm: Algorithm
    task_type : TaskType
    status : ModelStatus
    hyperparams : Optional[dict]
    metrics : Dict
    created_at : datetime

