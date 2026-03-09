from pathlib import Path

from app.schemas.model_schema import ModelCreate, ModelResponse
from app.models.user import User
from fastapi import UploadFile

from app.services.dataset_service import DatasetService
from app.services.model_service import ModelService
from app.db.database import get_client
import logging

logger = logging.getLogger(__name__)

class TrainingService:

    @staticmethod
    async def start_training(file : UploadFile , model_data : ModelCreate , user : User):

        dataset = None

        client = get_client()



        try:

            async with await client.start_session() as session:
                async with session.start_transaction():
                    logger.info(f"Creating dataset for {file.filename}")

                    dataset = await DatasetService.upload_dataset(file , user , session=session)

                    logger.info(f"Creating model for {model_data.name}")

                    model = await ModelService.create_model(dataset.id , model_data , user , session=session)

                    return ModelResponse(
                        id=str(model.id),
                        dataset_id=str(model.dataset_id),
                        user_id=str(model.user_id),
                        name=model.name,
                        algorithm=model.algorithm,
                        task_type=model.task_type,
                        features=model.features,
                        target_column=model.target_column,
                        hyperparams=model.hyperparams,
                        file_path=model.file_path,
                        metrics=model.metrics,
                        status=model.status,
                        created_at=model.created_at,
                        updated_at=model.updated_at,
                    )
        except Exception as e:
            logger.error(f"error saving dataset in model : {e}")
            if dataset and dataset.file_path:
                try:
                    logger.info(f"unlinking dataset for {file.filename}")
                    Path(dataset.file_path).unlink(missing_ok=True)
                except Exception as e:
                    logger.error(f"error unlinking dataset for {file.filename}")
                    raise e
            raise e



