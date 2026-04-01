from math import ceil
from pathlib import Path

from beanie import PydanticObjectId
from multipart import file_path
import logging
from app.core.exceptions import NotFoundException, UnauthorizedException, BadRequestException
from app.db.database import get_client
from app.models.dataset import Dataset
from app.schemas.model_schema import ModelCreate, ModelResponse, ModelsPageResponse, ModelPaginationResponse
from app.models.user import User
from app.models.model import Model, Algorithm
from beanie.operators import In

logger = logging.getLogger(__name__)

class ModelService:

    @staticmethod
    async def create_model(dataset_id : str , model_data : ModelCreate , user : User , session):

        dataset = await Dataset.get(PydanticObjectId(dataset_id) , session=session)
        if not dataset:
            raise NotFoundException(message="Dataset not found")

        if dataset.user_id != user.id:
            raise UnauthorizedException(message="User not authorized")



        model = Model(
            dataset_id = PydanticObjectId(dataset_id),
            user_id= user.id,
            name=model_data.name,

            algorithm=model_data.algorithm,
            task_type=model_data.task_type,
            features=[col.name for col in dataset.columns if col.name != model_data.target_column],
            target_column=model_data.target_column,
            hyperparams=model_data.hyperparams,
            metrics={},
            file_path=""
        )

        await model.insert(session=session)

        logger.info(f"Model {model.id} created by user {user.id}")

        return model

    @staticmethod
    async def get_models(user : User , page : int = 1):

        query = Model.find(Model.user_id == PydanticObjectId(user.id))
        total = await query.count()

        models = await query.skip((page - 1) * 6).limit(6).to_list()



        return ModelPaginationResponse(
            models=[
                ModelsPageResponse(
                    id=str(model.id),
                    name=model.name,
                    accuracy=model.metrics.get("accuracy") if model.algorithm in [
                        Algorithm.logistic_regression] else None,
                    algorithm=model.algorithm,
                    status=model.status,
                    created_at=model.created_at
                )
                for model in models
            ],
            total=total,
            page=page,
            total_pages=ceil(total / 6)
        )

    @staticmethod
    async def delete_model(model_id: str, user: User):
        model = await Model.find_one(
            Model.id == PydanticObjectId(model_id),
            Model.user_id == user.id
        )
        if not model:
            raise NotFoundException(message="Model not found")

        dataset = await Dataset.find_one(Dataset.id == model.dataset_id)
        if not dataset:
            raise NotFoundException(message="Dataset not found")

        client = get_client()
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    logger.info(f"Deleting dataset {dataset.id}")
                    await dataset.delete(session=session)
                    logger.info(f"Deleting model {model_id}")
                    await model.delete(session=session)
                except Exception as e:
                    logger.error(f"Transaction failed, rolling back: {e}")
                    raise e

        logger.info("Deleting dataset file")
        Path(dataset.file_path).unlink(missing_ok=True)
        logger.info("Deleting model file")
        Path(model.file_path).unlink(missing_ok=True)






