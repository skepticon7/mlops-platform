from fastapi import UploadFile , File , Depends , APIRouter

from app.models.user import User
from app.schemas.dataset_schema import DatasetResponse
from app.services.dataset_service import DatasetService
from app.core.security import get_current_user


router = APIRouter(prefix="/dataset" , tags=["dataset"])


@router.post("/upload" , response_model= DatasetResponse)
async def upload_dataset(
        file : UploadFile = File(...) ,
        current_user : User = Depends(get_current_user),
        dataset_service : DatasetService = Depends()
):
    return await dataset_service.upload_dataset(file , current_user)


@router.get("/")
async def get_datasets(
        current_user : User = Depends(get_current_user),
        dataset_service : DatasetService = Depends()
):
    print("Here")
    return await dataset_service.get_datasets_by_user_id(str(current_user.id))