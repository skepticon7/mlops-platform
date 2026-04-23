import pandas as pd

from app.models.dataset import ColumnType

def infer_column_type(series: pd.Series):
    if pd.api.types.is_numeric_dtype(series):
        return ColumnType.numeric

    if pd.api.types.is_datetime64_any_dtype(series):
        return ColumnType.datetime

    if series.nunique() / len(series) > 0.95:
        return ColumnType.id

    if series.dtype == "object" and series.nunique() < 50:
        return ColumnType.categorical

    return ColumnType.text


def infer_feature_validity(series, col_name, target_column=None):

    # target
    if col_name == target_column:
        return False, "target_column"

    # missing check (FIXED)
    missing_ratio = series.isna().mean()
    if missing_ratio > 0.5:
        return False, "too_many_missing"

    s = series.dropna()

    if len(s) == 0:
        return False, "empty_column"

    uniqueness_ratio = s.nunique() / max(len(s), 1)

    # ID-like columns (numeric or text)
    if len(s) > 50 and uniqueness_ratio > 0.98:
        return False, "unique_id"

    # text columns
    if s.dtype == "object":
        nunique = s.nunique()

        if nunique > 50:
            return False, "high_cardinality"

        avg_length = s.astype(str).str.len().mean()

        if avg_length > 10 and uniqueness_ratio > 0.5:
            return False, "ticket_like_id"

    return True, None
    # target
    if col_name == target_column:
        return False, "target_column"

    s = series.dropna()

    if len(s) == 0:
        return False, "empty_column"

    uniqueness_ratio = s.nunique() / len(s)

    # 1. pure unique ID columns
    if uniqueness_ratio > 0.98:
        return False, "unique_id"

    # 2. high-cardinality text (IMPORTANT FIX)
    if s.dtype == "object":
        nunique = s.nunique()

        if nunique > 50:
            return False, "high_cardinality"

        # 🚨 SPECIAL CASE: ticket-like patterns
        avg_length = s.astype(str).str.len().mean()

        # heuristic: structured alphanumeric codes
        if avg_length > 8 and nunique / len(s) > 0.3:
            return False, "ticket_like_id"

    # 3. too many missing values
    if s.isna().mean() > 0.5:
        return False, "too_many_missing"

    return True, None


def get_valid_features(columns , target_column):
    clean_features = []
    for col in columns:
        if col.name == target_column:
            continue

        if not getattr(col, "is_valid_feature", True):
            continue

        clean_features.append(col.name)
    return clean_features


