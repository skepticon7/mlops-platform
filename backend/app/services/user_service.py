from beanie import PydanticObjectId
from starlette.responses import JSONResponse

from app.core.exceptions import BadRequestException, NotFoundException
from app.schemas.user_schema import UserCreate, UserResponse
from app.models.user_model import User
from app.core.security import hash_password

async def create_user(user_data : UserCreate) -> UserResponse:

    user_check = await User.find_one(User.email == user_data.email)
    if user_check:
        raise BadRequestException("Email Already Registered")

    hashed_password = hash_password(user_data.password)

    data = user_data.model_dump(exclude={"password"})

    user = User(
        **data,
        password=hashed_password
    )

    await user.insert()

    return UserResponse.model_validate(user)


async def get_user_by_id(user_id : str) -> UserResponse:

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise NotFoundException(f"User with id {user_id} not found")

    return UserResponse.model_validate(user)
