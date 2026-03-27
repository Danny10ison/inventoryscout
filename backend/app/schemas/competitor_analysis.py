from datetime import datetime

from pydantic import BaseModel, Field


class CompetitorSnapshot(BaseModel):
    id: int
    name: str
    url: str


class CompetitorAnalysisCreate(BaseModel):
    competitor_ids: list[int] = Field(..., min_length=1)
    analysis_goal: str | None = Field(default=None, max_length=500)


class CompetitorAnalysisOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    status: str
    analysis_goal: str | None
    summary: str
    market_position: str
    competition_score: int
    positioning_score: int
    pricing_pressure_score: int
    trend_score: int
    overall_score: int
    confidence_score: int
    confidence_level: str
    data_freshness: str
    sources_used: list[str]
    sources_failed: list[str]
    evidence: list[dict[str, object]]
    scoring_version: str
    recommendation: str
    competitor_ids: list[int]
    competitor_snapshots: list[CompetitorSnapshot]
    strengths: list[str]
    opportunities: list[str]
    risks: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
