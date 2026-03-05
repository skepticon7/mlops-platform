from beanie import Document
from pydantic import EmailStr
from app.models.mixing import TimestampMixin

class User(Document , TimestampMixin):
    firstName : str
    lastName : str
    email : EmailStr
    password : str

    class Settings:
        name = "users"