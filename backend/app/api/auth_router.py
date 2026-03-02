
from fastapi import APIRouter

from app.schemas.user_schema import UserResponse, UserCreate
from app.services.user_service import (
    create_user,
    get_user_by_id
)

router = APIRouter(prefix="/api/auth" , tags=["auth"])

@router.post("/register" , response_model=UserResponse)
async def register(user_data : UserCreate):
    """
        Register a new User
        Will raise an exception if the user already exists by email or the data validation fails
    """
    return await create_user(user_data)


@router.get("/get_user/{id}" , response_model=UserResponse)
async def get_user(id : str):
    return await get_user_by_id(id)
