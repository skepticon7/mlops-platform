from fastapi.params import Depends

from app.core.security import get_current_user
from app.models.user import User
from app.services.dataset_service import DatasetService


# example of dependency injection (DI) in fastAPI
# will only work if dataset_service contains a user attribute needed to be injected
# it's just an example for future usage
def get_dataset_service(current_user : User = Depends(get_current_user)) -> DatasetService:
    return DatasetService(current_user)