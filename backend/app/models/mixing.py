from datetime import datetime, timezone

from beanie import Replace, before_event, SaveChanges
from pydantic import BaseModel, Field


class TimestampMixin(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = None

    @before_event(Replace, SaveChanges)
    def set_updated_at(self):
        self.updated_at = datetime.now(timezone.utc)