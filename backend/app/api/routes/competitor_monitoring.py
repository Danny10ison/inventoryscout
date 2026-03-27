from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_user_access
from app.schemas.competitor_monitoring import (
    CompetitorMonitoringRunCreate,
    CompetitorMonitoringRunOut,
)
from app.services.competitor_monitoring_service import CompetitorMonitoringService

router = APIRouter(
    prefix="/users/{user_id}/competitors/{competitor_id}/monitoring-runs",
    tags=["Competitor Monitoring"],
)


@router.post(
    "/",
    response_model=CompetitorMonitoringRunOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Competitor Monitoring Run",
    description="Run and save a competitor monitoring snapshot.",
)
def create_competitor_monitoring_run(
    user_id: int,
    competitor_id: int,
    payload: CompetitorMonitoringRunCreate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> CompetitorMonitoringRunOut:
    service = CompetitorMonitoringService(db)
    return service.create_monitoring_run(
        user_id,
        competitor_id,
        payload.monitoring_goal,
    )


@router.get(
    "/",
    response_model=list[CompetitorMonitoringRunOut],
    status_code=status.HTTP_200_OK,
    summary="List Competitor Monitoring Runs",
    description="List saved monitoring history for a competitor.",
)
def list_competitor_monitoring_runs(
    user_id: int,
    competitor_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> list[CompetitorMonitoringRunOut]:
    service = CompetitorMonitoringService(db)
    return service.list_monitoring_runs(user_id, competitor_id)


@router.get(
    "/{monitoring_run_id}",
    response_model=CompetitorMonitoringRunOut,
    status_code=status.HTTP_200_OK,
    summary="Get Competitor Monitoring Run",
    description="Fetch a saved monitoring run for a competitor.",
)
def get_competitor_monitoring_run(
    user_id: int,
    competitor_id: int,
    monitoring_run_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> CompetitorMonitoringRunOut:
    service = CompetitorMonitoringService(db)
    return service.get_monitoring_run(user_id, competitor_id, monitoring_run_id)
