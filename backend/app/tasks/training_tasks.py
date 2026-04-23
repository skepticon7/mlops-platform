import logging
import asyncio

import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId

from app.core.celery_app import celery_app
from app.core.config import MONGO_URI, DB_NAME

from app.core.exceptions import NotFoundException, BadRequestException
from app.models.model import Model , ModelStatus , Algorithm , TaskType
from app.models.dataset import Dataset
from app.utils.ModelUtils import evaluate_regression, evaluate_classification, create_model, \
    split_data, prepare_target, load_dataset, prepare_features, train_model, evaluate_clustering, dump_model, fit_transform_features

logger = logging.getLogger(__name__)


MODEL_DIR = Path(__file__).parent.parent / "storage" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)




async def init_beanie_for_task():
    """
    Initialize a fresh Motor client and Beanie for the Celery task context.
    This ensures the client is bound to the current event loop.
    """
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(
        database=client[DB_NAME],
        document_models=[Model, Dataset]
    )
    return client


@celery_app.task(bind=True, name="train_model")
def train_model_task(self, model_id: str):
    try:
        return asyncio.run(train_model_async(self, model_id))
    except Exception as e:
        asyncio.run(mark_as_failed(model_id, str(e)))
        raise


async def train_model_async(task, model_id: str):
    logger.info("starting training for the model")

    client = await init_beanie_for_task()

    model_file_path = None
    train_samples = None
    test_samples = None

    try:
        async with await client.start_session() as session:
            async with session.start_transaction():
                ml_model = await Model.get(PydanticObjectId(model_id))

                if not ml_model:
                    raise NotFoundException("Model not found")

                if ml_model.status != ModelStatus.pending:
                    raise BadRequestException("Model is not in pending status")

                ml_model.status = ModelStatus.training
                await ml_model.save(session=session)


        dataset = await Dataset.get(ml_model.dataset_id)

        if not dataset:
            raise NotFoundException(message="Dataset not found")

        df = await load_dataset(dataset)

        X , clean_features , cat_cols , num_cols , preprocessor = prepare_features(df , dataset.columns , ml_model.target_column)

        # =========================
        # TARGET PREPARATION
        # =========================

        y , label_encoder = prepare_target(df , ml_model.target_column , ml_model.algorithm)

        # =========================
        # SPLIT
        # =========================
        X_train, X_test, y_train, y_test = split_data(X , y)

        train_samples = len(X_train)
        test_samples = len(X_test)


        # =========================
        # TRANSFORM
        # =========================
        X_train_transformed , X_test_transformed = fit_transform_features(preprocessor , X_train , X_test)

        # =========================
        # MODEL
        # =========================

        model = create_model(ml_model.algorithm , ml_model.hyperparams)

        train_model(model , X_train_transformed , y_train)

        y_train_pred = model.predict(X_train_transformed)
        y_test_pred = model.predict(X_test_transformed)



        residual_std = None
        # =========================
        # METRICS
        # =========================
        if ml_model.algorithm == Algorithm.linear_regression:
            residuals = y_train - y_train_pred
            residual_std = float(np.std(residuals))
            metrics = evaluate_regression(model , y_test_pred , y_train_pred , y_train , y_test , preprocessor)

        elif ml_model.algorithm == Algorithm.logistic_regression:
            metrics = evaluate_classification(y_test, y_test_pred)

        elif ml_model.algorithm == Algorithm.kmeans:
            metrics = evaluate_clustering(model, X_train_transformed)



        # =========================
        # SAVE MODEL
        # =========================
        task.update_state(state="PROGRESS", meta={"progress": 90})

        model_file_path = MODEL_DIR / f"{model_id}.joblib"

        dump_model(
            model ,
            preprocessor ,
            clean_features ,
            cat_cols ,
            num_cols ,
            ml_model.algorithm ,
            residual_std ,
            label_encoder,
            model_file_path
        )

        async with await client.start_session() as session:
            async with session.start_transaction():
                ml_model.status = ModelStatus.completed
                ml_model.metrics = metrics
                ml_model.train_samples = train_samples
                ml_model.test_samples = test_samples
                ml_model.file_path = str(model_file_path)
                ml_model.updated_at = datetime.utcnow()
                await ml_model.save(session=session)

        task.update_state(state="SUCCESS", meta={"progress": 100})

        return {
            "status": "completed",
            "metrics": metrics,
            "model_id": model_id,
        }

    except Exception as e:
        logger.error(f"Error in training: {e}", exc_info=True)

        if model_file_path and model_file_path.exists():
            model_file_path.unlink()

        raise

    finally:
        client.close()

async def mark_as_failed(model_id: str, error_message: str):
    client = None
    try:
        client = await init_beanie_for_task()
        ml_model = await Model.get(PydanticObjectId(model_id))

        if ml_model:
            ml_model.status = ModelStatus.failed
            ml_model.error_message = error_message
            ml_model.updated_at = datetime.utcnow()
            await ml_model.save()

            logger.info(f"Model {model_id} marked as failed: {error_message}")

    except Exception as e:
        logger.error(f"Error marking model as failed: {e}", exc_info=True)
    finally:
        if client:
            client.close()



