from enum import Enum
from typing import List , Optional , Dict
from beanie import PydanticObjectId
from app.models.mixing import TimestampMixin
from beanie import Document


class TaskType(str , Enum):
    supervised = "supervised"
    unsupervised = "unsupervised"


class Algorithm(str, Enum):
    linear_regression = "linear_regression"
    logistic_regression = "logistic_regression"
    kmeans = "kmeans"
    dbscan = "dbscan"

class ModelStatus(str , Enum):
    training = "training"
    ready = "ready"
    failed = "failed"

class Model(Document , TimestampMixin):
    user_id : PydanticObjectId
    dataset_id : PydanticObjectId
    name : str
    algorithm : Algorithm
    task_type : TaskType
    target_column : Optional[str] = None
    features : Optional[List[str]] = None
    hyperparams : Optional[Dict] = None
    metrics : Optional[Dict] = None
    file_path : Optional[str] = None
    status : ModelStatus = ModelStatus.training

    class Settings:
        name = "models"
        indexes = ["user_id" , "dataset_id"]