from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_user_access
from app.schemas.competitor_analysis import CompetitorAnalysisCreate, CompetitorAnalysisOut
from app.services.competitor_analysis_service import CompetitorAnalysisService

router = APIRouter(
    prefix="/users/{user_id}/products/{product_id}/competitor-analyses",
    tags=["Competitor Analyses"],
)


@router.post(
    "/",
    response_model=CompetitorAnalysisOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Competitor Analysis",
    description="Run and save a competitor analysis for a product.",
)
def create_competitor_analysis(
    user_id: int,
    product_id: int,
    payload: CompetitorAnalysisCreate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> CompetitorAnalysisOut:
    service = CompetitorAnalysisService(db)
    return service.create_analysis(user_id, product_id, payload)


@router.get(
    "/",
    response_model=list[CompetitorAnalysisOut],
    status_code=status.HTTP_200_OK,
    summary="List Competitor Analyses",
    description="List saved competitor analyses for a product.",
)
def list_competitor_analyses(
    user_id: int,
    product_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> list[CompetitorAnalysisOut]:
    service = CompetitorAnalysisService(db)
    return service.list_analyses(user_id, product_id)


@router.get(
    "/{analysis_id}",
    response_model=CompetitorAnalysisOut,
    status_code=status.HTTP_200_OK,
    summary="Get Competitor Analysis",
    description="Fetch a saved competitor analysis for a product.",
)
def get_competitor_analysis(
    user_id: int,
    product_id: int,
    analysis_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> CompetitorAnalysisOut:
    service = CompetitorAnalysisService(db)
    return service.get_analysis(user_id, product_id, analysis_id)
