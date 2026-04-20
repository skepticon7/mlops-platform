from enum import Enum

from beanie import Document , PydanticObjectId
from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.models.mixing import TimestampMixin



class ColumnType(str , Enum):
    numeric = "numeric"
    categorical = "categorical"
    datetime = "datetime"
    text = "text"
    id = "id"


class DatasetColumnInfo(BaseModel):
    name: str
    dType: ColumnType
    example: str | int | float | None
    is_valid_feature : bool = True
    exclusion_reason : str | None = None


class Dataset(Document , TimestampMixin):
    user_id : PydanticObjectId
    name : str
    unique_name : str
    file_path : str
    row_count : int
    columns : List[DatasetColumnInfo]

    class Settings:
        name = "datasets"
        indexes = ["user_id"]
