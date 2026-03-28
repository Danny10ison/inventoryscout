from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text

from app.models.base import Base


class CompetitorAnalysis(Base):
    __tablename__ = "competitor_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="completed")
    analysis_goal = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
    market_position = Column(String, nullable=False)
    positioning = Column(Text, nullable=True)
    pricing_signal = Column(Text, nullable=True)
    differentiators = Column(JSON, nullable=False, default=list)
    market_signals = Column(JSON, nullable=False, default=list)
    trend_signals = Column(JSON, nullable=False, default=list)
    competition_score = Column(Integer, nullable=False)
    positioning_score = Column(Integer, nullable=False)
    pricing_pressure_score = Column(Integer, nullable=False)
    trend_score = Column(Integer, nullable=False)
    overall_score = Column(Integer, nullable=False)
    confidence_score = Column(Integer, nullable=False, default=0)
    confidence_level = Column(String, nullable=False, default="Low")
    data_freshness = Column(String, nullable=False, default="stale")
    sources_used = Column(JSON, nullable=False, default=list)
    sources_failed = Column(JSON, nullable=False, default=list)
    evidence = Column(JSON, nullable=False, default=list)
    scoring_version = Column(String, nullable=False, default="v2-live")
    recommendation = Column(Text, nullable=False)
    competitor_ids = Column(JSON, nullable=False)
    competitor_snapshots = Column(JSON, nullable=False)
    strengths = Column(JSON, nullable=False)
    opportunities = Column(JSON, nullable=False)
    risks = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
