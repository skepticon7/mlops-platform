from pathlib import Path

from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import Ridge, LinearRegression, LogisticRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, classification_report, confusion_matrix, \
    silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
import pandas as pd
import numpy as np
import inspect
import joblib
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder

from app.core.exceptions import NotFoundException, BadRequestException
from app.models.model import Algorithm
from app.utils.DatasetUtils import get_valid_features

MODEL_CACHE = {}
DATASET_DIR = Path(__file__).parent.parent / "storage/models"

ALGORITHM_MAP = {
    Algorithm.linear_regression: LinearRegression,
    Algorithm.logistic_regression: LogisticRegression,
    Algorithm.kmeans: KMeans,
    Algorithm.pca: PCA,
}



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


def load_model(model_id: str):
        if model_id in MODEL_CACHE:
            return MODEL_CACHE[model_id]

        path = f"{DATASET_DIR}/{model_id}.joblib"

        try:
            bundle = joblib.load(path)
            MODEL_CACHE[model_id] = bundle
            return bundle
        except Exception:
            raise NotFoundException(f"Model {model_id} not found")


def create_preprocessor(categorical_cols , numerical_cols):
    transformers = []

    if categorical_cols:
        transformers.append((
            "cat",
            Pipeline([
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(drop="first", handle_unknown="ignore", sparse_output=False)),
            ]),
            categorical_cols
        ))

    if numerical_cols:
        transformers.append((
            "num",
            Pipeline([
                ("imputer", SimpleImputer(strategy="mean")),
                ("scaler", StandardScaler()),
            ]),
            numerical_cols
        ))

    return ColumnTransformer(transformers=transformers)


async def load_dataset(dataset) -> pd.DataFrame:
    return pd.read_csv(dataset.file_path)


def fit_transform_features(preprocessor, x_train, x_test):
    preprocessor.fit(x_train)

    X_train = preprocessor.transform(x_train)
    X_test = preprocessor.transform(x_test)

    return X_train, X_test




def prepare_features(df, dataset_columns, target_column):
    clean_features = get_valid_features(dataset_columns, target_column)

    if not clean_features:
        raise BadRequestException("No valid features found")

    X = df[clean_features].copy()

    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numerical_cols = X.select_dtypes(include=["number"]).columns.tolist()

    preprocessor = create_preprocessor(categorical_cols, numerical_cols)

    return X, clean_features, categorical_cols, numerical_cols, preprocessor


def prepare_target(df, target_column, algorithm):
    y = df[target_column].copy()
    label_encoder = None

    if algorithm == Algorithm.linear_regression:
        y = np.log1p(y)
    elif y.dtype == "object" or y.dtype.name == "category":
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(y)

    return y, label_encoder


def split_data(X , y):
    return train_test_split(X , y , test_size=0.2 , random_state=42)


def create_model(algorithm, hyperparams):
    algorithm_class = ALGORITHM_MAP.get(algorithm)
    valid_params = get_valid_hyperparams(algorithm_class, hyperparams)

    if algorithm == Algorithm.linear_regression:
        return Ridge(alpha=10.0)

    return algorithm_class(**valid_params)


def train_model(model, X_train, y_train):
    model.fit(X_train, y_train)
    return model


def evaluate_regression(model, y_test_pred, y_train_pred , y_train, y_test, preprocessor):
    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)

    rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    mae = mean_absolute_error(y_test, y_test_pred)

    train_mse = mean_squared_error(y_train, y_train_pred)
    test_mse = mean_squared_error(y_test, y_test_pred)

    intercept = float(model.intercept_) if hasattr(model, "intercept_") else None
    coef_norm = float(np.linalg.norm(model.coef_)) if hasattr(model, "coef_") else None

    try:
        feature_names = preprocessor.get_feature_names_out()
    except:
        feature_names = [f"f_{i}" for i in range(len(model.coef_))]

    coef_abs = np.abs(model.coef_)
    importance = coef_abs / (coef_abs.max() + 1e-8)

    s = pd.Series(importance, index=feature_names)

    feature_importance = s.nlargest(5)

    metrics = {
                "test_mse": float(test_mse),
                "train_mse": float(train_mse),
                "rmse": float(rmse),
                "mae": float(mae),
                "coef_norm": float(coef_norm),
                "intercept": intercept,
                "test_r2": float(test_r2),
                "train_r2": float(train_r2),
                "features_importance": {
                    str(k): float(v) for k, v in feature_importance.items()
                }
    }

    return metrics


def evaluate_classification(y_test , y_test_pred):
    report = classification_report(y_test, y_test_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_test_pred).tolist()
    per_class = {
        label: {
            "precision": float(values["precision"]),
            "recall": float(values["recall"]),
            "f1": float(values["f1-score"]),
            "support": int(values["support"]),
        }
        for label, values in report.items()
        if label not in ("accuracy", "macro avg", "weighted avg")
    }

    metrics = {
        "accuracy": float(report["accuracy"]),
        "precision": float(report["weighted avg"]["precision"]),
        "recall": float(report["weighted avg"]["recall"]),
        "f1": float(report["weighted avg"]["f1-score"]),
        "confusion_matrix": cm,
        "per_class": per_class
    }
    return metrics


def evaluate_clustering(model , X_transformed ):

    pca = PCA(n_components=0.9)
    X_reduced = pca.fit_transform(X_transformed)

    labels = model.fit_predict(X_reduced)

    metrics = {
        "silhouette_score": float(silhouette_score(X_transformed, labels)),
        "davies_bouldin_score": float(davies_bouldin_score(X_transformed, labels)),
        "calinski_harabasz_score": float(calinski_harabasz_score(X_transformed, labels)),
    }

    return metrics


def dump_model(model , preprocessor , clean_features , cat_cols , num_cols , algorithm , residual_std , label_encoder ,model_file_path ):
    joblib.dump({
        "model": model,
        "preprocessor": preprocessor,
        "features": clean_features,
        "categorical_cols": cat_cols,
        "numerical_cols": num_cols,
        "label_encoder" : label_encoder,
        "algorithm": algorithm.value,
        "residual_std": residual_std if algorithm == Algorithm.linear_regression else None,
    }, model_file_path)