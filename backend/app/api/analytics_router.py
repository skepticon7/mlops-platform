from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analytics_schema import DashboardMetricsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard", response_model=DashboardMetricsResponse)
async def get_dashboard(current_user: User = Depends(get_current_user)):
    """
    Returns aggregated dashboard metrics for the currently authenticated user.
    """
    return await AnalyticsService.get_dashboard_metrics(str(current_user.id))
