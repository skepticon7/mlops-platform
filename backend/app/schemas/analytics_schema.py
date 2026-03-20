from pydantic import BaseModel
from typing import List, Optional

class AccuracyLeaderboardItem(BaseModel):
    name: str
    algo: str
    acc: float

class DeploymentItem(BaseModel):
    id: str
    modelId: str
    model: str
    endpoint: str
    active: bool
    created: str

class DashboardMetricsResponse(BaseModel):
    models_trained: int
    active_deployments: int
    total_predictions: str   # Sent as string e.g "12.4k" for UI ease, or can be int
    avg_accuracy: str        # Sent as string e.g "92.9%" 
    accuracy_leaderboard: List[AccuracyLeaderboardItem]
    recent_deployments: List[DeploymentItem]
    prediction_volume: List[int]
