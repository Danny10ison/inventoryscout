from datetime import datetime

from pydantic import BaseModel, Field


class CompetitorMonitoringRunCreate(BaseModel):
    monitoring_goal: str | None = Field(default=None, max_length=500)


class CompetitorMonitoringRunOut(BaseModel):
    id: int
    user_id: int
    competitor_id: int
    status: str
    summary: str
    pricing_signal: str | None
    alert_level: str
    pricing_change_score: int
    market_activity_score: int
    risk_score: int
    overall_score: int
    confidence_score: int
    confidence_level: str
    data_freshness: str
    sources_used: list[str]
    sources_failed: list[str]
    evidence: list[dict[str, object]]
    scoring_version: str
    market_signals: list[str]
    trend_signals: list[str]
    risks: list[str]
    recommendations: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
