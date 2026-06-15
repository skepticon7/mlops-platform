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
    silhouette_score, davies_bouldin_score, calinski_harabasz_score,
    confusion_matrix, classification_report
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
            # Convert string booleans and numbers to their appropriate Python types
            if isinstance(value, str):
                if value.lower() == 'true':
                    value = True
                elif value.lower() == 'false':
                    value = False
                else:
                    try:
                        value = int(value)
                    except ValueError:
                        try:
                            value = float(value)
                        except ValueError:
                            pass
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
    train_samples = 0
    test_samples = 0
    residual_std = None
    pca_transformer = None
    try:
        try:
            async with await client.start_session() as session:
                async with session.start_transaction():
                    ml_model = await Model.get(PydanticObjectId(model_id), session=session)
                    print("model id : " + model_id)
                    print(ml_model)
                    if not ml_model:
                        raise NotFoundException("Model not found")

                    if ml_model.status != ModelStatus.pending:
                        raise BadRequestException("Model is not in pending status")

                    ml_model.status = ModelStatus.training
                    await ml_model.save(session=session)
        except Exception as e:
            if "transaction" in str(e).lower() or "replica set" in str(e).lower() or "not active" in str(e).lower():
                logger.info("Transactions not supported. Updating model status without transaction.")
                ml_model = await Model.get(PydanticObjectId(model_id))
                print("model id : " + model_id)
                print(ml_model)
                if not ml_model:
                    raise NotFoundException("Model not found")

                if ml_model.status != ModelStatus.pending:
                    raise BadRequestException("Model is not in pending status")

                ml_model.status = ModelStatus.training
                await ml_model.save()
            else:
                raise e

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

            if ml_model.algorithm == Algorithm.logistic_regression:
                if pd.api.types.is_float_dtype(y):
                    raise BadRequestException(
                        message=f"Target column '{ml_model.target_column}' is continuous (float). "
                                f"Logistic Regression is a classification algorithm. "
                                f"For continuous targets, please use Linear Regression instead."
                    )
                unique_vals = y.nunique()
                if unique_vals > 20 and not (y.dtype == "object" or y.dtype.name == "category"):
                    raise BadRequestException(
                        message=f"Target column '{ml_model.target_column}' has {unique_vals} unique values. "
                                f"Logistic Regression is a classification algorithm. "
                                f"For numeric continuous targets like prices or counts, please use Linear Regression instead."
                    )

            target_encoder = None

            if y.dtype == "object" or y.dtype.name == "category":
                target_encoder = LabelEncoder()
                y = target_encoder.fit_transform(y)

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            train_samples = len(X_train)
            test_samples = len(X_test)

            task.update_state(state="PROGRESS", meta={"progress": 40, "status": "training"})

            X_train_transformed = preprocessor.fit_transform(X_train)
            X_test_transformed = preprocessor.transform(X_test)


            valid_hyperparams = get_valid_hyperparams(algorithm_class, ml_model.hyperparams)
            model = algorithm_class(**valid_hyperparams)

            model.fit(X_train_transformed, y_train)


            task.update_state(state="PROGRESS", meta={"progress": 70, "status": "evaluating"})

            y_pred = model.predict(X_test_transformed)

            if ml_model.algorithm == Algorithm.logistic_regression:
                report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
                per_class = {}
                classes = model.classes_

                if target_encoder:
                    decoded_classes = target_encoder.inverse_transform(classes)
                    class_map = {str(enc): str(dec) for enc, dec in zip(classes, decoded_classes)}
                else:
                    class_map = {str(c): str(c) for c in classes}

                for k, v in report.items():
                    if k in class_map:
                        per_class[class_map[k]] = {
                            "precision": float(v.get("precision", 0.0)),
                            "recall": float(v.get("recall", 0.0)),
                            "f1-score": float(v.get("f1-score", 0.0)),
                            "support": int(v.get("support", 0)),
                        }

                cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()
                if target_encoder:
                    cm_labels = [str(c) for c in decoded_classes]
                else:
                    cm_labels = [str(c) for c in classes]

                metrics = {
                    "accuracy": float(accuracy_score(y_test, y_pred)),
                    "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
                    "recall": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
                    "f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
                    "confusion_matrix": cm,
                    "confusion_matrix_labels": cm_labels,
                    "per_class": per_class
                }
            elif ml_model.algorithm == Algorithm.linear_regression:
                y_train_pred = model.predict(X_train_transformed)
                train_mse = mean_squared_error(y_train, y_train_pred)
                train_r2 = r2_score(y_train, y_train_pred)
                test_mse = mean_squared_error(y_test, y_pred)
                test_r2 = r2_score(y_test, y_pred)
                rmse = root_mean_squared_error(y_test, y_pred)
                mae = mean_absolute_error(y_test, y_pred)

                # Compute residual standard deviation
                residuals = y_train - y_train_pred
                residual_std = float(np.std(residuals))

                intercept = float(model.intercept_) if hasattr(model, "intercept_") else 0.0
                coef_norm = float(np.linalg.norm(model.coef_)) if hasattr(model, "coef_") else 0.0

                try:
                    feature_names = preprocessor.get_feature_names_out()
                except:
                    feature_names = [f"f_{i}" for i in range(len(model.coef_))]

                coef_abs = np.abs(model.coef_)
                importance = coef_abs / (coef_abs.max() + 1e-8)
                s = pd.Series(importance, index=feature_names)
                feature_importance = s.nlargest(5)
                features_importance_dict = {str(k): float(v) for k, v in feature_importance.items()}

                metrics = {
                    "accuracy": max(0.0, float(test_r2)),
                    "test_mse": float(test_mse),
                    "train_mse": float(train_mse),
                    "rmse": float(rmse),
                    "mae": float(mae),
                    "coef_norm": float(coef_norm),
                    "intercept": intercept,
                    "test_r2": float(test_r2),
                    "train_r2": float(train_r2),
                    "features_importance": features_importance_dict
                }

        else:
            target_encoder = None
            train_samples = len(X)
            test_samples = 0

            task.update_state(state="PROGRESS", meta={"progress": 40, "status": "training"})

            X_transformed = preprocessor.fit_transform(X)

            valid_hyperparams = get_valid_hyperparams(algorithm_class, ml_model.hyperparams)

            if ml_model.algorithm == Algorithm.kmeans:
                # PCA reduction is now optional, controlled by apply_pca
                if ml_model.apply_pca:
                    pca = PCA(n_components=0.9)
                    X_transformed = pca.fit_transform(X_transformed)
                    pca_transformer = pca

                # Auto-select optimal k if n_clusters was not provided
                if "n_clusters" not in valid_hyperparams or valid_hyperparams.get("n_clusters") is None:
                    raw_hyperparams = ml_model.hyperparams or {}
                    try:
                        max_k = int(raw_hyperparams.get("max_k", 10))
                    except (ValueError, TypeError):
                        max_k = 10
                    max_k = min(max_k, len(X_transformed) - 1)
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

                from app.utils.ModelUtils import evaluate_clustering
                metrics = evaluate_clustering(
                    model=model,
                    X_transformed=X_transformed,
                    X_raw=X.values,
                    feature_names=ml_model.features
                )
                metrics["optimal_k"] = int(model.n_clusters)
                metrics["accuracy"] = max(0.0, float(metrics.get("silhouette_score", 0.0) or 0.0))

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
            "residual_std": residual_std,
            "pca_transformer": pca_transformer,
        }, model_file_path)

        try:
            async with await client.start_session() as session:
                async with session.start_transaction():
                    ml_model.status = ModelStatus.completed
                    ml_model.metrics = metrics
                    ml_model.file_path = str(model_file_path)
                    ml_model.train_samples = train_samples
                    ml_model.test_samples = test_samples
                    ml_model.updated_at = datetime.now(timezone.utc)
                    await ml_model.save(session=session)
        except Exception as e:
            if "transaction" in str(e).lower() or "replica set" in str(e).lower() or "not active" in str(e).lower():
                logger.info("Transactions not supported. Saving completed model details without transaction.")
                ml_model.status = ModelStatus.completed
                ml_model.metrics = metrics
                ml_model.file_path = str(model_file_path)
                ml_model.train_samples = train_samples
                ml_model.test_samples = test_samples
                ml_model.updated_at = datetime.now(timezone.utc)
                await ml_model.save()
            else:
                raise e

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