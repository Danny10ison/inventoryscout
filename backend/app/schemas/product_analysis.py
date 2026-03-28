from datetime import datetime

from pydantic import BaseModel, Field


class ProductAnalysisCreate(BaseModel):
    analysis_goal: str | None = Field(default=None, max_length=500)


class ProductAnalysisOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    status: str
    analysis_goal: str | None
    summary: str
    value_proposition: str | None
    key_features: list[str]
    demand_signals: list[str]
    trend_signals: list[str]
    competitive_signals: list[str]
    market_readiness: str
    demand_outlook: str
    competition_level: str
    demand_score: int
    competition_score: int
    trend_score: int
    opportunity_score: int
    overall_score: int
    confidence_score: int
    confidence_level: str
    data_freshness: str
    sources_used: list[str]
    sources_failed: list[str]
    evidence: list[dict[str, object]]
    scoring_version: str
    recommendation: str
    strengths: list[str]
    gaps: list[str]
    risks: list[str]
    next_steps: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
