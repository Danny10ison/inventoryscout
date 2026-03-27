from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_user_access
from app.schemas.competitor import CompetitorCreate, CompetitorOut, CompetitorUpdate
from app.services.competitor_service import CompetitorService

router = APIRouter(prefix="/users/{user_id}/competitors", tags=["Competitors"])


@router.post(
    "/",
    response_model=CompetitorOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Competitor",
    description="Add a competitor for a specific user.",
)
def create_competitor(
    user_id: int,
    payload: CompetitorCreate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> CompetitorOut:
    service = CompetitorService(db)
    return service.create_competitor(user_id, payload)


@router.get(
    "/",
    response_model=list[CompetitorOut],
    status_code=status.HTTP_200_OK,
    summary="List Competitors",
    description="List all competitors for a specific user.",
)
def list_competitors(
    user_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> list[CompetitorOut]:
    service = CompetitorService(db)
    return service.list_competitors(user_id)


@router.get(
    "/{competitor_id}",
    response_model=CompetitorOut,
    status_code=status.HTTP_200_OK,
    summary="Get Competitor",
    description="Fetch a single competitor for a specific user.",
)
def get_competitor(
    user_id: int,
    competitor_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> CompetitorOut:
    service = CompetitorService(db)
    return service.get_competitor(user_id, competitor_id)


@router.patch(
    "/{competitor_id}",
    response_model=CompetitorOut,
    status_code=status.HTTP_200_OK,
    summary="Update Competitor",
    description="Update competitor details for a specific user.",
)
def update_competitor(
    user_id: int,
    competitor_id: int,
    payload: CompetitorUpdate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> CompetitorOut:
    service = CompetitorService(db)
    return service.update_competitor(user_id, competitor_id, payload)


@router.delete(
    "/{competitor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Competitor",
    description="Delete a competitor for a specific user.",
)
def delete_competitor(
    user_id: int,
    competitor_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> Response:
    service = CompetitorService(db)
    service.delete_competitor(user_id, competitor_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
