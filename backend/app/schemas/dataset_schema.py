from datetime import datetime

from pydantic import BaseModel

from typing import List

from app.models.dataset import DatasetColumnInfo


class DatasetRowCountProjection(BaseModel):
    row_count: int
    columns : List[DatasetColumnInfo]

class DatasetResponse(BaseModel):
    id : str
    user_id : str
    name : str
    row_count : int
    file_path : str
    columns : List[DatasetColumnInfo]
    created_at : datetime
    updated_at: datetime | None = None