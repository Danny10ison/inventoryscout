from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class CompetitorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    url: HttpUrl


class CompetitorCreate(CompetitorBase):
    pass


class CompetitorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    url: HttpUrl | None = None


class CompetitorOut(CompetitorBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
