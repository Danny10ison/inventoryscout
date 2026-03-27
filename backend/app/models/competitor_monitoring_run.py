from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text

from app.models.base import Base


class CompetitorMonitoringRun(Base):
    __tablename__ = "competitor_monitoring_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="completed")
    summary = Column(Text, nullable=False)
    pricing_signal = Column(String, nullable=True)
    alert_level = Column(String, nullable=False)
    pricing_change_score = Column(Integer, nullable=False)
    market_activity_score = Column(Integer, nullable=False)
    risk_score = Column(Integer, nullable=False)
    overall_score = Column(Integer, nullable=False)
    confidence_score = Column(Integer, nullable=False, default=0)
    confidence_level = Column(String, nullable=False, default="Low")
    data_freshness = Column(String, nullable=False, default="stale")
    sources_used = Column(JSON, nullable=False, default=list)
    sources_failed = Column(JSON, nullable=False, default=list)
    evidence = Column(JSON, nullable=False, default=list)
    scoring_version = Column(String, nullable=False, default="v2-live")
    market_signals = Column(JSON, nullable=False)
    trend_signals = Column(JSON, nullable=False)
    risks = Column(JSON, nullable=False)
    recommendations = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
