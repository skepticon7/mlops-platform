from datetime import datetime

from pydantic import BaseModel

from app.models.dataset import ColumnInfo
from typing import List



class DatasetResponse(BaseModel):
    id : str
    user_id : str
    name : str
    row_count : int
    file_path : str
    columns : List[ColumnInfo]
    created_at : datetime
    updated_at: datetime | None = None