from beanie import PydanticObjectId
from multipart import file_path
import logging
from app.core.exceptions import NotFoundException, UnauthorizedException, BadRequestException
from app.models.dataset import Dataset
from app.schemas.model_schema import ModelCreate, ModelResponse, ModelsPageResponse
from app.models.user import User
from app.models.model import Model
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
    async def get_models(user : User):
        models = await Model.find(Model.user_id == PydanticObjectId(user.id)).to_list()

        return [
            ModelsPageResponse(
                id=str(model.id),
                name=model.name,
                algorithm=model.algorithm,
                status=model.status,
                created_at=model.created_at
            )
            for model in models
        ]



