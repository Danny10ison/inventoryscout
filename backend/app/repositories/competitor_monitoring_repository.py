from sqlalchemy.orm import Session

from app.models.competitor_monitoring_run import CompetitorMonitoringRun


class CompetitorMonitoringRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user_competitor_and_id(
        self,
        user_id: int,
        competitor_id: int,
        monitoring_run_id: int,
    ) -> CompetitorMonitoringRun | None:
        return (
            self.db.query(CompetitorMonitoringRun)
            .filter(
                CompetitorMonitoringRun.user_id == user_id,
                CompetitorMonitoringRun.competitor_id == competitor_id,
                CompetitorMonitoringRun.id == monitoring_run_id,
            )
            .first()
        )

    def list_by_user_and_competitor(
        self,
        user_id: int,
        competitor_id: int,
    ) -> list[CompetitorMonitoringRun]:
        return (
            self.db.query(CompetitorMonitoringRun)
            .filter(
                CompetitorMonitoringRun.user_id == user_id,
                CompetitorMonitoringRun.competitor_id == competitor_id,
            )
            .order_by(CompetitorMonitoringRun.created_at.desc())
            .all()
        )

    def create(
        self,
        *,
        user_id: int,
        competitor_id: int,
        status: str,
        summary: str,
        pricing_signal: str | None,
        alert_level: str,
        pricing_change_score: int,
        market_activity_score: int,
        risk_score: int,
        overall_score: int,
        confidence_score: int,
        confidence_level: str,
        data_freshness: str,
        sources_used: list[str],
        sources_failed: list[str],
        evidence: list[dict[str, object]],
        scoring_version: str,
        market_signals: list[str],
        trend_signals: list[str],
        risks: list[str],
        recommendations: list[str],
    ) -> CompetitorMonitoringRun:
        monitoring_run = CompetitorMonitoringRun(
            user_id=user_id,
            competitor_id=competitor_id,
            status=status,
            summary=summary,
            pricing_signal=pricing_signal,
            alert_level=alert_level,
            pricing_change_score=pricing_change_score,
            market_activity_score=market_activity_score,
            risk_score=risk_score,
            overall_score=overall_score,
            confidence_score=confidence_score,
            confidence_level=confidence_level,
            data_freshness=data_freshness,
            sources_used=sources_used,
            sources_failed=sources_failed,
            evidence=evidence,
            scoring_version=scoring_version,
            market_signals=market_signals,
            trend_signals=trend_signals,
            risks=risks,
            recommendations=recommendations,
        )
        self.db.add(monitoring_run)
        self.db.commit()
        self.db.refresh(monitoring_run)
        return monitoring_run
