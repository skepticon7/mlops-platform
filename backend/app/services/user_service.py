"""
User service — business logic for user operations.

All database interactions and password verification happen here,
keeping the router layer thin and focused on HTTP concerns.
"""

from beanie import PydanticObjectId

from app.core.exceptions import BadRequestException, NotFoundException, UnauthorizedException
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user_schema import UserCreate, UserResponse


# ──────────────────────────────────────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────────────────────────────────────

async def create_user(user_data: UserCreate) -> UserResponse:
    """
    Register a new user.

    Raises:
        BadRequestException: if the email is already taken.
    """
    user_check = await User.find_one(User.email == user_data.email)
    if user_check:
        raise BadRequestException("Email Already Registered")

    hashed_password = hash_password(user_data.password)

    data = user_data.model_dump(exclude={"password"})

    user = User(
        **data,
        password=hashed_password,
    )

    await user.insert()

    return UserResponse.model_validate(user)


# ──────────────────────────────────────────────────────────────────────────────
# Lookup
# ──────────────────────────────────────────────────────────────────────────────

async def get_user_by_id(user_id: str) -> UserResponse:
    """
    Retrieve a single user by their MongoDB ObjectId.

    Raises:
        NotFoundException: if no user matches the given ID.
    """
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise NotFoundException(f"User with id {user_id} not found")

    return UserResponse.model_validate(user)


# ──────────────────────────────────────────────────────────────────────────────
# Authentication
# ──────────────────────────────────────────────────────────────────────────────

async def authenticate_user(email: str, password: str) -> User:
    """
    Validate user credentials and return the User document.

    Steps:
        1. Look up the user by email.
        2. Verify the password against the stored bcrypt hash.
        3. Return the User document on success.

    Raises:
        UnauthorizedException: if the email is not found or the password
            does not match.  A generic message is used intentionally to
            avoid leaking whether an account exists.
    """
    user = await User.find_one(User.email == email)
    if not user:
        raise UnauthorizedException("Invalid email or password")

    if not verify_password(password, user.password):
        raise UnauthorizedException("Invalid email or password")

    return user
