from datetime import datetime

from beanie import Replace, before_event, SaveChanges
from pydantic import BaseModel, Field


class TimestampMixin(BaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)  # ✅ this is enough
    updated_at: datetime | None = None

    @before_event(Replace, SaveChanges)  # only need this one
    def set_updated_at(self):
        self.updated_at = datetime.utcnow()