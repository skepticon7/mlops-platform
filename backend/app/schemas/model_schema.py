from beanie import PydanticObjectId
from pydantic import BaseModel , Field
from datetime import datetime

from app.models.dataset import DatasetColumnInfo
from app.models.model import Algorithm, TaskType, ModelStatus
from typing import Optional, List, Dict, Any, Literal , Union


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

class DatasetDetails(BaseModel):
    total_rows: int
    total_features: int
    target_column: Optional[str]
    train_samples: int
    test_samples: int


class PredictRequest(BaseModel):
    algorithm: Algorithm
    features : Dict[str, Any]

class BasePredictionResponse(BaseModel):
    model_id: str
    type: str

class ClassificationResponse(BasePredictionResponse):
    type: Literal["classification"]
    prediction : str
    confidence : float
    probabilities: Dict[str , float]

class ClusteringResponse(BasePredictionResponse):
    type: Literal["clustering"]
    cluster : int
    label : str
    distances: Dict[str , float ] | None = None
    size: int | None = None

class RegressionResponse(BasePredictionResponse):
    type: Literal["regression"]
    prediction: float
    ci: list[float] | None = None
    feature_importance: Dict[str, float] | None = None


PredictResponse = Union[
    ClassificationResponse,
    ClusteringResponse,
    RegressionResponse,
]

class ModelDetailsResponse(BaseModel):
    id: str
    name: str
    algorithm: Algorithm
    task_type : TaskType
    status : ModelStatus
    features : List[DatasetColumnInfo]
    target_column : Optional[str]
    hyperparams : Optional[dict]
    dataset_details: DatasetDetails
    metrics : Dict
    created_at : datetime

