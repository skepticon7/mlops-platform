from beanie import PydanticObjectId
from starlette.datastructures import UploadFile
from pathlib import Path
import pandas as pd
import logging
import uuid
import aiofiles
from app.models.user import User
from app.models.dataset import Dataset , DatasetColumnInfo
from app.core.exceptions import BadRequestException, NotFoundException
from app.schemas.dataset_schema import DatasetResponse
from typing import List

from app.utils.DatasetUtils import infer_column_type, infer_feature_validity

DATASET_DIR = Path(__file__).parent.parent / "storage/datasets"
DATASET_DIR.mkdir(parents=True, exist_ok=True)
MAX_SIZE = 100 * 1024 * 1024
logger = logging.getLogger(__name__)


class DatasetService:

    @staticmethod
    async def upload_dataset(file: UploadFile, user: User, session):

        if not file.filename.endswith(".csv"):
            raise BadRequestException(message="Only CSV files are supported")

        safe_filename = Path(file.filename).name
        unique_filename = f"{uuid.uuid4()}_{safe_filename}"
        file_path = DATASET_DIR / unique_filename

        DATASET_DIR.mkdir(parents=True, exist_ok=True)

        file_size = 0
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                while chunk := await file.read(8192):
                    file_size += len(chunk)
                    if file_size > MAX_SIZE:
                        raise BadRequestException(
                            message=f"File exceeds {MAX_SIZE / 1_000_000}MB limit"
                        )
                    await f.write(chunk)
        except BadRequestException:
            file_path.unlink(missing_ok=True)
            raise
        except Exception as e:
            file_path.unlink(missing_ok=True)
            logger.error(f"File upload failed: {e}", exc_info=True)
            raise BadRequestException(message="File upload failed")

        try:
            df = pd.read_csv(file_path)

            if df.empty:
                raise BadRequestException(message="CSV file is empty")

            if len(df.columns) > 1000:  # Reasonable limit
                raise BadRequestException(message="Too many columns (max 1000)")

            # Normalize column names to lowercase
            df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

            # Save the CSV back with normalized column names
            df.to_csv(file_path, index=False)

            columns_info = []

            for col in df.columns:
                series = df[col]

                example_series = series.dropna()
                example = example_series.iloc[0] if not example_series.empty else None

                is_valid, reason = infer_feature_validity(
                    series=series,
                    col_name=col,
                    target_column="survived"  # or pass dynamically
                )

                columns_info.append(
                    DatasetColumnInfo(
                        name=col,
                        dType=infer_column_type(series),
                        example=example,
                        is_valid_feature=is_valid,
                        exclusion_reason=reason,
                    )
                )



        except BadRequestException:
            file_path.unlink(missing_ok=True)
            raise
        except Exception as e:
            file_path.unlink(missing_ok=True)
            logger.error(f"CSV validation failed: {e}", exc_info=True)
            raise BadRequestException(
                message=f"Invalid CSV format: {str(e)[:100]}"
            )

        dataset = Dataset(
            user_id=user.id,
            name=safe_filename,
            unique_name=unique_filename,
            file_path=str(file_path),
            row_count=len(df),
            columns=columns_info
        )

        try:
            await dataset.insert(session=session)
        except Exception as e:
            file_path.unlink(missing_ok=True)  # Cleanup on DB failure
            logger.error(f"Database insert failed: {e}", exc_info=True)
            raise

        return DatasetResponse(
            id=str(dataset.id),
            user_id=str(dataset.user_id),
            name=dataset.name,
            file_path=dataset.file_path,
            row_count=dataset.row_count,
            columns=dataset.columns,
            created_at=dataset.created_at,
            updated_at=dataset.updated_at
        )

    @staticmethod
    async def get_datasets_by_user_id(user_id: str) -> List[DatasetResponse]:

        try:
            user_oid = PydanticObjectId(user_id)
        except Exception:
            raise NotFoundException(message="Invalid user ID format")

        user_check = await User.get(PydanticObjectId(user_oid))

        if not user_check:
            raise NotFoundException(message="user not found")

        datasets = await Dataset.find(Dataset.user_id == user_oid).to_list()

        return [
            DatasetResponse(
                id=str(ds.id),
                user_id=str(ds.user_id),
                name=ds.name,
                file_path=ds.file_path,
                row_count=ds.row_count,
                columns=ds.columns,
                created_at=ds.created_at,
                updated_at=ds.updated_at
            )
            for ds in datasets
        ]