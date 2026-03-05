from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


class UserCreate(BaseModel):
    firstName : str = Field(min_length = 1)
    lastName : str = Field(min_length = 1)
    email : EmailStr
    password : str = Field(min_length = 6 , max_length = 20)


class UserResponse(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("id", mode="before")
    @classmethod
    def convert_id(cls, v):
        return str(v)