from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.competitor_repository import CompetitorRepository
from app.repositories.user_repository import UserRepository
from app.schemas.competitor import CompetitorCreate, CompetitorUpdate


class CompetitorService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)
        self.repository = CompetitorRepository(db)

    def _ensure_user_exists(self, user_id: int) -> None:
        if not self.user_repository.get_by_id(user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

    def _get_competitor_or_404(self, user_id: int, competitor_id: int):
        competitor = self.repository.get_by_user_and_id(user_id, competitor_id)
        if not competitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitor not found",
            )
        return competitor

    def list_competitors(self, user_id: int):
        self._ensure_user_exists(user_id)
        return self.repository.list_by_user_id(user_id)

    def get_competitor(self, user_id: int, competitor_id: int):
        self._ensure_user_exists(user_id)
        return self._get_competitor_or_404(user_id, competitor_id)

    def create_competitor(self, user_id: int, payload: CompetitorCreate):
        self._ensure_user_exists(user_id)
        normalized_url = str(payload.url)

        if self.repository.get_by_user_and_name(user_id, payload.name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competitor name already exists for this user",
            )

        if self.repository.get_by_user_and_url(user_id, normalized_url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competitor URL already exists for this user",
            )

        try:
            return self.repository.create(
                user_id=user_id,
                name=payload.name,
                url=normalized_url,
            )
        except IntegrityError as exc:
            self.repository.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to create competitor",
            ) from exc

    def update_competitor(self, user_id: int, competitor_id: int, payload: CompetitorUpdate):
        self._ensure_user_exists(user_id)
        competitor = self._get_competitor_or_404(user_id, competitor_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "url" in update_data and update_data["url"] is not None:
            update_data["url"] = str(update_data["url"])

        if "name" in update_data and update_data["name"] != competitor.name:
            existing_competitor = self.repository.get_by_user_and_name(user_id, update_data["name"])
            if existing_competitor and existing_competitor.id != competitor_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Competitor name already exists for this user",
                )

        if "url" in update_data and update_data["url"] != competitor.url:
            existing_competitor = self.repository.get_by_user_and_url(user_id, update_data["url"])
            if existing_competitor and existing_competitor.id != competitor_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Competitor URL already exists for this user",
                )

        try:
            return self.repository.update(competitor, **update_data)
        except IntegrityError as exc:
            self.repository.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to update competitor",
            ) from exc

    def delete_competitor(self, user_id: int, competitor_id: int):
        self._ensure_user_exists(user_id)
        competitor = self._get_competitor_or_404(user_id, competitor_id)
        self.repository.delete(competitor)
