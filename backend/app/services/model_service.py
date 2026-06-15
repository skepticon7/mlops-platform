from http.client import HTTPException
from math import ceil
from pathlib import Path

import numpy as np
import pandas as pd

from beanie import PydanticObjectId
from celery.worker.state import total_count
from multipart import file_path
import logging

from app.core.exceptions import NotFoundException, UnauthorizedException, BadRequestException
from app.db.database import get_client
from app.models.dataset import Dataset, DatasetColumnInfo, ColumnType
from app.schemas.dataset_schema import DatasetRowCountProjection
from app.schemas.model_schema import ModelCreate, ModelResponse, ModelsPageResponse, ModelPaginationResponse, \
    ModelDetailsResponse, DatasetDetails, PredictRequest, PredictResponse, ClassificationResponse, RegressionResponse, \
    ClusteringResponse
from app.models.user import User
from app.models.model import Model, Algorithm, ModelStatus
from beanie.operators import In

from app.utils.ModelUtils import load_model

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
            features=[col.name for col in dataset.columns if col.name != model_data.target_column and col.is_valid_feature],
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
    async def get_completed_models(user: User):
        query = Model.find(
            Model.user_id == PydanticObjectId(user.id),
            Model.status == ModelStatus.completed
        )
        models = await query.to_list()
        return [
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
        ]

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
        try:
            async with await client.start_session() as session:
                async with session.start_transaction():
                    logger.info(f"Deleting dataset {dataset.id}")
                    await dataset.delete(session=session)
                    logger.info(f"Deleting model {model_id}")
                    await model.delete(session=session)
        except Exception as e:
            if "transaction" in str(e).lower() or "replica set" in str(e).lower() or "not active" in str(e).lower():
                logger.info("Transactions not supported. Deleting without transaction.")
                await dataset.delete()
                await model.delete()
            else:
                logger.error(f"Deletion failed: {e}")
                raise e

        logger.info("Deleting dataset file")
        Path(dataset.file_path).unlink(missing_ok=True)
        logger.info("Deleting model file")
        Path(model.file_path).unlink(missing_ok=True)

    @staticmethod
    async def get_model(model_id: str, user: User):

        model = await Model.find_one(Model.id == PydanticObjectId(model_id))
        if not model:
            raise NotFoundException(message="Model not found")

        dataset = await Dataset.find_one(Dataset.id == model.dataset_id)

        if not dataset:
            dataset_details = DatasetDetails(
                total_rows=(model.train_samples or 0) + (model.test_samples or 0),
                total_features=len(model.features),
                target_column=model.target_column,
                train_samples=model.train_samples or 0,
                test_samples=model.test_samples or 0
            )
            clean_features = [
                DatasetColumnInfo(
                    name=f,
                    dType=ColumnType.numeric,
                    example=None,
                    is_valid_feature=True
                )
                for f in model.features
            ]
        else:
            dataset_details = DatasetDetails(
                total_rows=dataset.row_count,
                total_features=len(dataset.columns),
                target_column=model.target_column,
                train_samples=model.train_samples or 0,
                test_samples=model.test_samples or 0
            )
            clean_features = [
                f for f in dataset.columns
                if f.name != model.target_column and f.is_valid_feature
            ]

        return ModelDetailsResponse(
            id= str(model.id),
            name= model.name,
            algorithm= model.algorithm,
            status= model.status,
            task_type= model.task_type,
            target_column=model.target_column,
            features=clean_features,
            dataset_details=dataset_details,
            hyperparams= model.hyperparams,
            metrics= model.metrics,
            created_at= model.created_at
        )

    @staticmethod
    def predict(model_id: str, request: PredictRequest):

        bundle = load_model(model_id)

        model = bundle["model"]
        sigma = bundle.get("residual_std", 0)
        algorithm = Algorithm(bundle["algorithm"])
        preprocessor = bundle["preprocessor"]
        features = bundle["features"]
        pca_transformer = bundle.get("pca_transformer")

        try:
            df = pd.DataFrame([request.features])[features]
        except Exception:
            raise BadRequestException(message="invalid input features")

        X = preprocessor.transform(df)
        if pca_transformer:
            X = pca_transformer.transform(X)
        preds = model.predict(X)


        if algorithm == Algorithm.logistic_regression:

            probs = model.predict_proba(X)[0]
            classes = model.classes_
            target_encoder = bundle.get("target_encoder") or bundle.get("label_encoder")

            if target_encoder:
                decoded_classes = target_encoder.inverse_transform(classes)
                probabilities = {
                    str(c): round(float(p), 2)
                    for c, p in zip(decoded_classes, probs)
                }
                prediction = decoded_classes[int(np.argmax(probs))]
            else:
                probabilities = {
                    str(c): round(float(p), 2)
                    for c, p in zip(classes, probs)
                }
                prediction = classes[int(np.argmax(probs))]

            confidence = round(float(np.max(probs)), 2)


            return ClassificationResponse(
                model_id=str(model_id),
                type="classification",
                prediction=str(prediction),
                confidence=confidence,
                probabilities=probabilities
            )

        elif algorithm == Algorithm.linear_regression:
            pred = float(preds[0])

            error = 1.96 * sigma if sigma else 0

            lower = round(pred - error, 3)
            upper = round(pred + error, 3)

            pourcentage_ci = round((error / abs(pred)) * 100, 2) if pred != 0 else 0

            return RegressionResponse(
                model_id=str(model_id),
                type="regression",
                prediction=round(pred, 3),  # keep numeric
                ci=[lower, upper],  # keep numeric
                pourcentage_ci=pourcentage_ci
            )

        elif algorithm == Algorithm.kmeans:
            cluster = int(model.predict(X)[0])

            raw_distances = {}

            x = X[0]

            for i, centroid in enumerate(model.cluster_centers_):
                dist = np.linalg.norm(x - centroid)
                raw_distances[f"Cluster {i}"] = float(dist)


            eps = 1e-8
            inv = {k: 1.0 / (v + eps) for k, v in raw_distances.items()}
            total = sum(inv.values())

            distances = {
                k: round(v / total, 4)
                for k, v in inv.items()
            }

            return ClusteringResponse(
                model_id=str(model_id),
                type="clustering",
                cluster=cluster,
                distances=distances
            )

        raise BadRequestException(message=f"Prediction not supported for algorithm: {algorithm}")




