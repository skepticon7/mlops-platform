from pathlib import Path

from beanie import PydanticObjectId
from fastapi import UploadFile, File, Depends, APIRouter
from fastapi.responses import FileResponse

from app.models.dataset import Dataset
from app.models.user import User
from app.schemas.dataset_schema import DatasetResponse
from app.services.dataset_service import DatasetService
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, UnauthorizedException


router = APIRouter(prefix="/dataset", tags=["dataset"])


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_user),
        dataset_service: DatasetService = Depends()
):
    return await dataset_service.upload_dataset(file, current_user)


@router.get("/")
async def get_datasets(
        current_user: User = Depends(get_current_user),
        dataset_service: DatasetService = Depends()
):
    return await dataset_service.get_datasets_by_user_id(str(current_user.id))


@router.get("/download/{dataset_id}")
async def download_dataset(
        dataset_id: str,
        current_user: User = Depends(get_current_user),
):
    """
    Download a dataset file.  Requires authentication and verifies
    the requesting user owns the dataset before serving the file.
    """
    dataset = await Dataset.get(PydanticObjectId(dataset_id))
    if not dataset:
        raise NotFoundException(message="Dataset not found")

    if dataset.user_id != current_user.id:
        raise UnauthorizedException(message="You do not own this dataset")

    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise NotFoundException(message="Dataset file not found on disk")

    return FileResponse(
        path=file_path,
        filename=dataset.name,
        media_type="text/csv",
    )