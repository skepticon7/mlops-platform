import logging
import asyncio

import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId

from app.core.celery_app import celery_app
from app.core.config import MONGO_URI, DB_NAME
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    root_mean_squared_error, mean_squared_error, mean_absolute_error, r2_score,
    silhouette_score, davies_bouldin_score, calinski_harabasz_score
)
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler, MinMaxScaler
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import inspect

from app.core.exceptions import NotFoundException, BadRequestException
from app.db.database import get_client
from app.models.model import Model, ModelStatus, Algorithm, TaskType
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
    Also converts string boolean values to actual booleans.
    """
    if not hyperparams:
        return {}

    # Get valid parameter names from the algorithm's __init__ signature
    sig = inspect.signature(algorithm_class.__init__)
    valid_params = set(sig.parameters.keys()) - {'self'}

    # Filter to only valid parameters and convert string booleans
    filtered_params = {}
    for key, value in hyperparams.items():
        if key in valid_params:
            # Convert string booleans to actual booleans
            if isinstance(value, str):
                if value.lower() == 'true':
                    value = True
                elif value.lower() == 'false':
                    value = False
            filtered_params[key] = value

    return filtered_params


def build_preprocessor(ml_model, X):
    """
    Build a ColumnTransformer preprocessor based on the model's preprocessing
    config.  Falls back to sensible defaults if no config is provided.
    """
    preprocessing = ml_model.preprocessing or {}
    num_imputer_strategy = preprocessing.get("numerical_imputer", "mean")
    cat_imputer_strategy = preprocessing.get("categorical_imputer", "constant")
    scaler_type = preprocessing.get("scaler", "standard")

    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numerical_cols = X.select_dtypes(include=["number"]).columns.tolist()

    transformers = []

    if categorical_cols:
        categorical_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy=cat_imputer_strategy, fill_value="missing")),
            ("onehot", OneHotEncoder(drop="first", handle_unknown="ignore", sparse_output=False)),
        ])
        transformers.append(("cat", categorical_pipeline, categorical_cols))

    if numerical_cols:
        steps = [
            ("imputer", SimpleImputer(strategy=num_imputer_strategy)),
        ]
        if scaler_type == "standard":
            steps.append(("scaler", StandardScaler()))
        elif scaler_type == "minmax":
            steps.append(("scaler", MinMaxScaler()))
        # scaler_type == "none" → no scaler step

        numerical_pipeline = Pipeline(steps)
        transformers.append(("num", numerical_pipeline, numerical_cols))

    preprocessor = ColumnTransformer(transformers=transformers)
    return preprocessor, categorical_cols, numerical_cols


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
            if feature in df.columns:
                is_all_unique = df[feature].nunique() == len(df)
                is_int_or_str = pd.api.types.is_integer_dtype(df[feature]) or pd.api.types.is_object_dtype(df[feature])

                if is_all_unique and is_int_or_str:
                    dropped_dynamic_ids.append(feature)
                    continue

            clean_features.append(feature)

        if dropped_dynamic_ids:
            logger.info(f"Dynamically dropped ID-like columns: {dropped_dynamic_ids}")

        # Update the model document in the DB so it reflects the actual features used
        if len(clean_features) != len(ml_model.features):
            ml_model.features = clean_features
        # --------------------------------

        X = df[ml_model.features].copy()

        # Build preprocessor from the model's config (or defaults)
        preprocessor, categorical_cols, numerical_cols = build_preprocessor(ml_model, X)

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

            if ml_model.algorithm == Algorithm.kmeans:
                # PCA reduction is now optional, controlled by apply_pca
                if ml_model.apply_pca:
                    pca = PCA(n_components=0.9)
                    X_transformed = pca.fit_transform(X_transformed)

                # Auto-select optimal k if n_clusters was not provided
                if "n_clusters" not in valid_hyperparams or valid_hyperparams.get("n_clusters") is None:
                    raw_hyperparams = ml_model.hyperparams or {}
                    max_k = min(raw_hyperparams.get("max_k", 10), len(X_transformed) - 1)
                    # Remove max_k from hyperparams since KMeans doesn't accept it
                    valid_hyperparams.pop("max_k", None)

                    best_k = 2
                    best_score = -1

                    task.update_state(state="PROGRESS", meta={"progress": 50, "status": "finding_optimal_k"})

                    for k in range(2, max_k + 1):
                        km = KMeans(n_clusters=k, **{p: v for p, v in valid_hyperparams.items() if p != "n_clusters"})
                        trial_labels = km.fit_predict(X_transformed)
                        score = silhouette_score(X_transformed, trial_labels)
                        if score > best_score:
                            best_score = score
                            best_k = k

                    logger.info(f"Auto-selected optimal k={best_k} (silhouette={best_score:.4f})")
                    valid_hyperparams["n_clusters"] = best_k
                else:
                    valid_hyperparams.pop("max_k", None)

                model = algorithm_class(**valid_hyperparams)
                labels = model.fit_predict(X_transformed)

                task.update_state(state="PROGRESS", meta={"progress": 70, "status": "evaluating"})

                metrics = {
                    "optimal_k": int(model.n_clusters),
                    "silhouette_score": float(silhouette_score(X_transformed, labels)),
                    "davies_bouldin_score": float(davies_bouldin_score(X_transformed, labels)),
                    "calinski_harabasz_score": float(calinski_harabasz_score(X_transformed, labels)),
                }
            elif ml_model.algorithm == Algorithm.pca:
                model = algorithm_class(**valid_hyperparams)
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
                ml_model.metrics = metrics
                ml_model.file_path = str(model_file_path)
                ml_model.updated_at = datetime.now(timezone.utc)
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
            ml_model.updated_at = datetime.now(timezone.utc)
            await ml_model.save()

            logger.info(f"Model {model_id} marked as failed: {error_message}")

    except Exception as e:
        logger.error(f"Error marking model as failed: {e}", exc_info=True)
    finally:
        if client:
            client.close()