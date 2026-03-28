from sqlalchemy.orm import Session

from app.models.competitor_analysis import CompetitorAnalysis


class CompetitorAnalysisRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user_product_and_id(
        self,
        user_id: int,
        product_id: int,
        analysis_id: int,
    ) -> CompetitorAnalysis | None:
        return (
            self.db.query(CompetitorAnalysis)
            .filter(
                CompetitorAnalysis.user_id == user_id,
                CompetitorAnalysis.product_id == product_id,
                CompetitorAnalysis.id == analysis_id,
            )
            .first()
        )

    def list_by_user_and_product(self, user_id: int, product_id: int) -> list[CompetitorAnalysis]:
        return (
            self.db.query(CompetitorAnalysis)
            .filter(
                CompetitorAnalysis.user_id == user_id,
                CompetitorAnalysis.product_id == product_id,
            )
            .order_by(CompetitorAnalysis.created_at.desc())
            .all()
        )

    def create(
        self,
        *,
        user_id: int,
        product_id: int,
        status: str,
        analysis_goal: str | None,
        summary: str,
        market_position: str,
        positioning: str | None,
        pricing_signal: str | None,
        differentiators: list[str],
        market_signals: list[str],
        trend_signals: list[str],
        competition_score: int,
        positioning_score: int,
        pricing_pressure_score: int,
        trend_score: int,
        overall_score: int,
        confidence_score: int,
        confidence_level: str,
        data_freshness: str,
        sources_used: list[str],
        sources_failed: list[str],
        evidence: list[dict[str, object]],
        scoring_version: str,
        recommendation: str,
        competitor_ids: list[int],
        competitor_snapshots: list[dict[str, object]],
        strengths: list[str],
        opportunities: list[str],
        risks: list[str],
    ) -> CompetitorAnalysis:
        analysis = CompetitorAnalysis(
            user_id=user_id,
            product_id=product_id,
            status=status,
            analysis_goal=analysis_goal,
            summary=summary,
            market_position=market_position,
            positioning=positioning,
            pricing_signal=pricing_signal,
            differentiators=differentiators,
            market_signals=market_signals,
            trend_signals=trend_signals,
            competition_score=competition_score,
            positioning_score=positioning_score,
            pricing_pressure_score=pricing_pressure_score,
            trend_score=trend_score,
            overall_score=overall_score,
            confidence_score=confidence_score,
            confidence_level=confidence_level,
            data_freshness=data_freshness,
            sources_used=sources_used,
            sources_failed=sources_failed,
            evidence=evidence,
            scoring_version=scoring_version,
            recommendation=recommendation,
            competitor_ids=competitor_ids,
            competitor_snapshots=competitor_snapshots,
            strengths=strengths,
            opportunities=opportunities,
            risks=risks,
        )
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis
