from app.models.model import Model
from app.schemas.analytics_schema import DashboardMetricsResponse, AccuracyLeaderboardItem, DeploymentItem
from beanie import PydanticObjectId

class AnalyticsService:
    @staticmethod
    async def get_dashboard_metrics(user_id: str) -> DashboardMetricsResponse:
        # Get all models for the user
        models = await Model.find({"user_id": PydanticObjectId(user_id)}).to_list()
        
        models_trained = len(models)
        
        # Calculate average accuracy from completed models
        completed_models = [m for m in models if m.status == "completed" and m.metrics and "accuracy" in m.metrics]
        
        avg_acc = 0.0
        if completed_models:
            total_acc = sum(float(m.metrics["accuracy"]) for m in completed_models)
            avg_acc = total_acc / len(completed_models)
        
        avg_accuracy_str = f"{avg_acc * 100:.1f}%" if completed_models else "—"

        # Accuracy Leaderboard (Top 3)
        sorted_models = sorted(completed_models, key=lambda m: float(m.metrics.get("accuracy", 0)), reverse=True)
        leaderboard = []
        for m in sorted_models[:3]:
            # Fallback algo name formatting
            algo_str = m.algorithm.value.replace("_", " ").title() if m.algorithm else "Unknown"
            
            leaderboard.append(
                AccuracyLeaderboardItem(
                    name=m.name,
                    algo=algo_str,
                    acc=float(m.metrics.get("accuracy", 0))
                )
            )

        # Mock data for features not yet in DB schema
        active_deployments = 0
        total_predictions = "0"
        prediction_volume = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        recent_deployments = []

        return DashboardMetricsResponse(
            models_trained=models_trained,
            active_deployments=active_deployments,
            total_predictions=total_predictions,
            avg_accuracy=avg_accuracy_str,
            accuracy_leaderboard=leaderboard,
            recent_deployments=recent_deployments,
            prediction_volume=prediction_volume
        )
