from sqlalchemy.orm import Session

from app.models.competitor import Competitor


class CompetitorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, competitor_id: int) -> Competitor | None:
        return self.db.query(Competitor).filter(Competitor.id == competitor_id).first()

    def get_by_user_and_id(self, user_id: int, competitor_id: int) -> Competitor | None:
        return (
            self.db.query(Competitor)
            .filter(Competitor.user_id == user_id, Competitor.id == competitor_id)
            .first()
        )

    def list_by_user_id(self, user_id: int) -> list[Competitor]:
        return (
            self.db.query(Competitor)
            .filter(Competitor.user_id == user_id)
            .order_by(Competitor.created_at.desc())
            .all()
        )

    def list_by_user_and_ids(self, user_id: int, competitor_ids: list[int]) -> list[Competitor]:
        return (
            self.db.query(Competitor)
            .filter(Competitor.user_id == user_id, Competitor.id.in_(competitor_ids))
            .all()
        )

    def get_by_user_and_name(self, user_id: int, name: str) -> Competitor | None:
        return (
            self.db.query(Competitor)
            .filter(Competitor.user_id == user_id, Competitor.name == name)
            .first()
        )

    def get_by_user_and_url(self, user_id: int, url: str) -> Competitor | None:
        return (
            self.db.query(Competitor)
            .filter(Competitor.user_id == user_id, Competitor.url == url)
            .first()
        )

    def create(self, *, user_id: int, name: str, url: str) -> Competitor:
        competitor = Competitor(user_id=user_id, name=name, url=url)
        self.db.add(competitor)
        self.db.commit()
        self.db.refresh(competitor)
        return competitor

    def update(self, competitor: Competitor, **fields) -> Competitor:
        for key, value in fields.items():
            setattr(competitor, key, value)

        self.db.add(competitor)
        self.db.commit()
        self.db.refresh(competitor)
        return competitor

    def delete(self, competitor: Competitor) -> None:
        self.db.delete(competitor)
        self.db.commit()
