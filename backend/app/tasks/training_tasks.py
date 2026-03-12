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
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression , LogisticRegression
from sklearn.cluster import KMeans , DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import (
    accuracy_score,precision_score,recall_score,f1_score,
    root_mean_squared_error , mean_squared_error , mean_absolute_error , r2_score,
    silhouette_score , davies_bouldin_score , calinski_harabasz_score
)
from sklearn.preprocessing import LabelEncoder , OneHotEncoder , StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import inspect  # Add this import

from app.core.exceptions import NotFoundException, BadRequestException
from app.db.database import get_client
from app.models.model import Model , ModelStatus , Algorithm , TaskType
from app.models.dataset import Dataset

logger = logging.getLogger(__name__)

ALGORITHM_MAP = {
    Algorithm.linear_regression: LinearRegression,
    Algorithm.logistic_regression: LogisticRegression,
    Algorithm.kmeans: KMeans,
    Algorithm.pca: PCA,
}

MODEL_DIR = Path(__file__).parent.parent / "storage" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def get_valid_hyperparams(algorithm_class, hyperparams: dict | None) -> dict:
    """
    Filter hyperparameters to only include those valid for the given algorithm.
    This prevents errors when algorithm and hyperparams don't match.
    """
    if not hyperparams:
        return {}

    # Get valid parameter names from the algorithm's __init__ signature
    sig = inspect.signature(algorithm_class.__init__)
    valid_params = set(sig.parameters.keys()) - {'self'}

    # Filter to only valid parameters
    filtered_params = {
        key: value for key, value in hyperparams.items()
        if key in valid_params
    }

    return filtered_params


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

    # Initialize a fresh client for this event loop
    client = await init_beanie_for_task()

    model_file_path = None
    try:
        async with await client.start_session() as session:
            async with session.start_transaction():
                ml_model = await Model.get(PydanticObjectId(model_id))
                print("model id : " + model_id)
                print(ml_model)
                if not ml_model:
                    raise NotFoundException("Model not found")

                if ml_model.status != ModelStatus.pending:
                    raise BadRequestException("Model is not in pending status")

                ml_model.status = ModelStatus.training
                await ml_model.save(session=session)

        task.update_state(state="PROGRESS", meta={"progress": 10})

        dataset = await Dataset.get(ml_model.dataset_id)

        if not dataset:
            raise NotFoundException(message="Dataset not found")

        df = pd.read_csv(dataset.file_path)

        task.update_state(state="PROGRESS", meta={"progress": 20, "status": "preparing_features"})

        # --- DYNAMIC FEATURE CLEANING ---
        clean_features = []
        dropped_dynamic_ids = []

        for feature in ml_model.features:
            # 1. Drop the target column to prevent data leakage
            if feature == ml_model.target_column:
                continue

            # 2. Dynamically drop ID-like columns (100% unique values)
            # We only check integer or string/object columns. We keep float columns
            # because highly precise continuous data might naturally be unique.
            if feature in df.columns:
                is_all_unique = df[feature].nunique() == len(df)
                is_int_or_str = pd.api.types.is_integer_dtype(df[feature]) or pd.api.types.is_object_dtype(df[feature])

                if is_all_unique and is_int_or_str:
                    dropped_dynamic_ids.append(feature)
                    continue  # Skip adding to clean_features

            # If it passes the checks, keep the feature
            clean_features.append(feature)

        if dropped_dynamic_ids:
            logger.info(f"Dynamically dropped ID-like columns: {dropped_dynamic_ids}")

        # Update the model document in the DB so it reflects the actual features used
        if len(clean_features) != len(ml_model.features):
            ml_model.features = clean_features
        # --------------------------------

        X = df[ml_model.features].copy()

        categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
        numerical_cols = X.select_dtypes(include=["number"]).columns.tolist()

        transformers = []

        if categorical_cols:
            categorical_pipeline = Pipeline([
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(drop="first", handle_unknown="ignore", sparse_output=False)),
            ])
            transformers.append(("cat", categorical_pipeline, categorical_cols))

        if numerical_cols:
            numerical_pipeline = Pipeline([
                ("imputer", SimpleImputer(strategy="mean")),
                ("scaler", StandardScaler()),
            ])
            transformers.append(("num", numerical_pipeline, numerical_cols))

        preprocessor = ColumnTransformer(transformers=transformers)

        task.update_state(state="PROGRESS", meta={"progress": 30, "status": "preprocessing"})

        algorithm_class = ALGORITHM_MAP.get(ml_model.algorithm)

        if ml_model.algorithm in [Algorithm.linear_regression, Algorithm.logistic_regression]:
            y = df[ml_model.target_column].copy()

            target_encoder = None

            if y.dtype == "object" or y.dtype.name == "category":
                target_encoder = LabelEncoder()
                y = target_encoder.fit_transform(y)

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )

            task.update_state(state="PROGRESS", meta={"progress": 40, "status": "training"})

            X_train_transformed = preprocessor.fit_transform(X_train)
            X_test_transformed = preprocessor.transform(X_test)


            valid_hyperparams = get_valid_hyperparams(algorithm_class, ml_model.hyperparams)
            model = algorithm_class(**valid_hyperparams)

            model.fit(X_train_transformed, y_train)


            task.update_state(state="PROGRESS", meta={"progress": 70, "status": "evaluating"})

            y_pred = model.predict(X_test_transformed)

            if ml_model.algorithm == Algorithm.logistic_regression:
                metrics = {
                    "accuracy": float(accuracy_score(y_test, y_pred)),
                    "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
                    "recall": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
                    "f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
                }
            elif ml_model.algorithm == Algorithm.linear_regression:
                metrics = {
                    "mse": float(mean_squared_error(y_test, y_pred)),
                    "rmse": float(root_mean_squared_error(y_test, y_pred)),
                    "mae": float(mean_absolute_error(y_test, y_pred)),
                    "r2": float(r2_score(y_test, y_pred)),
                }

        else:
            target_encoder = None

            task.update_state(state="PROGRESS", meta={"progress": 40, "status": "training"})

            X_transformed = preprocessor.fit_transform(X)

            valid_hyperparams = get_valid_hyperparams(algorithm_class, ml_model.hyperparams)
            model = algorithm_class(**valid_hyperparams)

            if ml_model.algorithm == Algorithm.kmeans:
                pca = PCA(n_components=0.9)
                X_transformed = pca.fit_transform(X_transformed)
                labels = model.fit_predict(X_transformed)

                task.update_state(state="PROGRESS", meta={"progress": 70, "status": "evaluating"})

                metrics = {
                    "silhouette_score": float(silhouette_score(X_transformed, labels)),
                    "davies_bouldin_score": float(davies_bouldin_score(X_transformed, labels)),
                    "calinski_harabasz_score": float(calinski_harabasz_score(X_transformed, labels)),
                }
            elif ml_model.algorithm == Algorithm.pca:
                model.fit(X_transformed)

                explained_ratio = model.explained_variance_ratio_

                metrics = {
                    "explained_variance_ratio": explained_ratio.tolist(),
                    "cumulative_variance_ratio": np.cumsum(explained_ratio).tolist(),
                    "n_components": int(model.n_components_),
                    "explained_variance": model.explained_variance_.tolist(),
                    "singular_values": model.singular_values_.tolist(),
                }

        task.update_state(state="PROGRESS", meta={"progress": 90, "status": "saving"})

        model_file_path = MODEL_DIR / f"{model_id}.joblib"

        joblib.dump({
            "model": model,
            "preprocessor": preprocessor,
            "target_encoder": target_encoder,
            "features": ml_model.features,
            "categorical_cols": categorical_cols,
            "numerical_cols": numerical_cols,
            "algorithm": ml_model.algorithm.value,
        }, model_file_path)

        async with await client.start_session() as session:
            async with session.start_transaction():
                ml_model.status = ModelStatus.completed
                ml_model.metrics = metrics  # ✅ Add this line
                ml_model.file_path = str(model_file_path)  # ✅ Also save the file path
                ml_model.updated_at = datetime.utcnow()
                await ml_model.save(session=session)

        task.update_state(state="SUCCESS", meta={"progress": 100, "status": "completed"})

        logger.info(f"Model {model_id} trained successfully with metrics: {metrics}")

        return {
            "status": "completed",
            "metrics": metrics,
            "model_id": model_id,
        }

    except Exception as e:
        logger.error(f"Error in train_model_async: {e}", exc_info=True)

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