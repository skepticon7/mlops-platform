from pathlib import Path

import joblib

from app.core.exceptions import NotFoundException

MODEL_CACHE = {}
DATASET_DIR = Path(__file__).parent.parent / "storage/models"


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
