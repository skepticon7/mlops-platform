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

        # Retrieve actual uploaded datasets count
        from app.models.dataset import Dataset
        datasets_count = await Dataset.find({"user_id": PydanticObjectId(user_id)}).count()

        # Retrieve actual prediction counts and volume (past 12 days)
        from app.db.database import get_client
        from app.core.config import DB_NAME
        from datetime import datetime, timezone, timedelta

        client = get_client()
        db = client[DB_NAME]
        user_pydantic_id = PydanticObjectId(user_id)

        total_preds = await db["prediction_logs"].count_documents({"user_id": user_pydantic_id})
        total_predictions = str(total_preds)

        # Get date range for the past 12 days
        today = datetime.now(timezone.utc).date()
        cutoff_date = today - timedelta(days=11)
        cutoff_dt = datetime.combine(cutoff_date, datetime.min.time(), tzinfo=timezone.utc)

        # Query and aggregate in Python to optimize database query to 1 roundtrip
        cursor = db["prediction_logs"].find({
            "user_id": user_pydantic_id,
            "timestamp": {"$gte": cutoff_dt}
        })

        volume_dict = {today - timedelta(days=i): 0 for i in range(12)}
        async for log in cursor:
            # Safe naive/aware UTC date extraction
            log_dt = log["timestamp"]
            if log_dt.tzinfo is None:
                log_dt = log_dt.replace(tzinfo=timezone.utc)
            log_date = log_dt.astimezone(timezone.utc).date()
            if log_date in volume_dict:
                volume_dict[log_date] += 1

        prediction_volume = [volume_dict[today - timedelta(days=i)] for i in range(11, -1, -1)]

        active_deployments = datasets_count
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
