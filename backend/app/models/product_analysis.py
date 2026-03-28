from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text

from app.models.base import Base


class ProductAnalysis(Base):
    __tablename__ = "product_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="completed")
    analysis_goal = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
    value_proposition = Column(Text, nullable=True)
    key_features = Column(JSON, nullable=False, default=list)
    demand_signals = Column(JSON, nullable=False, default=list)
    trend_signals = Column(JSON, nullable=False, default=list)
    competitive_signals = Column(JSON, nullable=False, default=list)
    market_readiness = Column(String, nullable=False)
    demand_outlook = Column(String, nullable=False)
    competition_level = Column(String, nullable=False)
    demand_score = Column(Integer, nullable=False)
    competition_score = Column(Integer, nullable=False)
    trend_score = Column(Integer, nullable=False)
    opportunity_score = Column(Integer, nullable=False)
    overall_score = Column(Integer, nullable=False)
    confidence_score = Column(Integer, nullable=False, default=0)
    confidence_level = Column(String, nullable=False, default="Low")
    data_freshness = Column(String, nullable=False, default="stale")
    sources_used = Column(JSON, nullable=False, default=list)
    sources_failed = Column(JSON, nullable=False, default=list)
    evidence = Column(JSON, nullable=False, default=list)
    scoring_version = Column(String, nullable=False, default="v2-live")
    recommendation = Column(Text, nullable=False)
    strengths = Column(JSON, nullable=False)
    gaps = Column(JSON, nullable=False)
    risks = Column(JSON, nullable=False)
    next_steps = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
