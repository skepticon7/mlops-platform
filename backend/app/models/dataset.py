from beanie import Document , PydanticObjectId
from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.models.mixing import TimestampMixin


class ColumnInfo(BaseModel):
    name : str
    dType : str


class Dataset(Document , TimestampMixin):
    user_id : PydanticObjectId
    name : str
    file_path : str
    row_count : int
    columns : List[ColumnInfo]

    class Settings:
        name = "datasets"
        indexes = ["user_id"]
