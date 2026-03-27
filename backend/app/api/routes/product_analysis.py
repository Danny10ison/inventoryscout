from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_user_access
from app.schemas.product_analysis import ProductAnalysisCreate, ProductAnalysisOut
from app.services.product_analysis_service import ProductAnalysisService

router = APIRouter(
    prefix="/users/{user_id}/products/{product_id}/analyses",
    tags=["Product Analyses"],
)


@router.post(
    "/",
    response_model=ProductAnalysisOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Product Analysis",
    description="Run and save a product analysis for a product.",
)
def create_product_analysis(
    user_id: int,
    product_id: int,
    payload: ProductAnalysisCreate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> ProductAnalysisOut:
    service = ProductAnalysisService(db)
    return service.create_analysis(user_id, product_id, payload)


@router.get(
    "/",
    response_model=list[ProductAnalysisOut],
    status_code=status.HTTP_200_OK,
    summary="List Product Analyses",
    description="List saved analyses for a product.",
)
def list_product_analyses(
    user_id: int,
    product_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> list[ProductAnalysisOut]:
    service = ProductAnalysisService(db)
    return service.list_analyses(user_id, product_id)


@router.get(
    "/{analysis_id}",
    response_model=ProductAnalysisOut,
    status_code=status.HTTP_200_OK,
    summary="Get Product Analysis",
    description="Fetch a saved product analysis for a product.",
)
def get_product_analysis(
    user_id: int,
    product_id: int,
    analysis_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> ProductAnalysisOut:
    service = ProductAnalysisService(db)
    return service.get_analysis(user_id, product_id, analysis_id)
