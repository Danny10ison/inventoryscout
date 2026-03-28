from sqlalchemy.orm import Session

from app.models.product_analysis import ProductAnalysis


class ProductAnalysisRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user_product_and_id(
        self,
        user_id: int,
        product_id: int,
        analysis_id: int,
    ) -> ProductAnalysis | None:
        return (
            self.db.query(ProductAnalysis)
            .filter(
                ProductAnalysis.user_id == user_id,
                ProductAnalysis.product_id == product_id,
                ProductAnalysis.id == analysis_id,
            )
            .first()
        )

    def list_by_user_and_product(self, user_id: int, product_id: int) -> list[ProductAnalysis]:
        return (
            self.db.query(ProductAnalysis)
            .filter(
                ProductAnalysis.user_id == user_id,
                ProductAnalysis.product_id == product_id,
            )
            .order_by(ProductAnalysis.created_at.desc())
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
        value_proposition: str | None,
        key_features: list[str],
        demand_signals: list[str],
        trend_signals: list[str],
        competitive_signals: list[str],
        market_readiness: str,
        demand_outlook: str,
        competition_level: str,
        demand_score: int,
        competition_score: int,
        trend_score: int,
        opportunity_score: int,
        overall_score: int,
        confidence_score: int,
        confidence_level: str,
        data_freshness: str,
        sources_used: list[str],
        sources_failed: list[str],
        evidence: list[dict[str, object]],
        scoring_version: str,
        recommendation: str,
        strengths: list[str],
        gaps: list[str],
        risks: list[str],
        next_steps: list[str],
    ) -> ProductAnalysis:
        analysis = ProductAnalysis(
            user_id=user_id,
            product_id=product_id,
            status=status,
            analysis_goal=analysis_goal,
            summary=summary,
            value_proposition=value_proposition,
            key_features=key_features,
            demand_signals=demand_signals,
            trend_signals=trend_signals,
            competitive_signals=competitive_signals,
            market_readiness=market_readiness,
            demand_outlook=demand_outlook,
            competition_level=competition_level,
            demand_score=demand_score,
            competition_score=competition_score,
            trend_score=trend_score,
            opportunity_score=opportunity_score,
            overall_score=overall_score,
            confidence_score=confidence_score,
            confidence_level=confidence_level,
            data_freshness=data_freshness,
            sources_used=sources_used,
            sources_failed=sources_failed,
            evidence=evidence,
            scoring_version=scoring_version,
            recommendation=recommendation,
            strengths=strengths,
            gaps=gaps,
            risks=risks,
            next_steps=next_steps,
        )
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis
