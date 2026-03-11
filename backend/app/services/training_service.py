from pathlib import Path

from app.schemas.model_schema import ModelCreate, ModelResponse
from app.models.user import User
from fastapi import UploadFile

from app.services.dataset_service import DatasetService
from app.services.model_service import ModelService
from app.db.database import get_client
import logging

from app.tasks.training_tasks import train_model_task, train_model_async

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
                    dataset = await DatasetService.upload_dataset(file, user, session=session)

                    logger.info(f"Creating model for {model_data.name}")
                    model = await ModelService.create_model(dataset.id, model_data, user, session=session)

            task = train_model_task.delay(str(model.id))

            return {
                "dataset_id": str(model.dataset_id),
                "model_id": str(model.id),
                "task_id" : str(task.id)
            }
        except Exception as e:
            logger.error(f"error training model : {e}")
            if dataset and dataset.file_path:
                try:
                    logger.info(f"unlinking dataset for {file.filename}")
                    Path(dataset.file_path).unlink(missing_ok=True)
                except Exception as e:
                    logger.error(f"error unlinking dataset for {file.filename}")
                    raise e
            raise e



