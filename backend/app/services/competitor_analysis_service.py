from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.integrations.tinyfish_client import TinyFishClient, TinyFishConfigurationError, TinyFishError
from app.repositories.competitor_analysis_repository import CompetitorAnalysisRepository
from app.repositories.competitor_repository import CompetitorRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.schemas.competitor_analysis import CompetitorAnalysisCreate
from app.services.intelligence_pipeline import (
    LiveSourceResult,
    build_evidence_payload,
    clamp_score,
    determine_confidence_level,
    determine_confidence_score,
    determine_data_freshness,
    determine_run_status,
    ensure_string_list,
    summarize_source_health,
    utcnow,
)


class CompetitorAnalysisService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)
        self.product_repository = ProductRepository(db)
        self.competitor_repository = CompetitorRepository(db)
        self.repository = CompetitorAnalysisRepository(db)

    def _ensure_user_exists(self, user_id: int) -> None:
        if not self.user_repository.get_by_id(user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

    def _get_product_or_404(self, user_id: int, product_id: int):
        product = self.product_repository.get_by_user_and_id(user_id, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return product

    def _get_analysis_or_404(self, user_id: int, product_id: int, analysis_id: int):
        analysis = self.repository.get_by_user_product_and_id(user_id, product_id, analysis_id)
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitor analysis not found",
            )
        return analysis

    def list_analyses(self, user_id: int, product_id: int):
        self._ensure_user_exists(user_id)
        self._get_product_or_404(user_id, product_id)
        return self.repository.list_by_user_and_product(user_id, product_id)

    def get_analysis(self, user_id: int, product_id: int, analysis_id: int):
        self._ensure_user_exists(user_id)
        self._get_product_or_404(user_id, product_id)
        return self._get_analysis_or_404(user_id, product_id, analysis_id)

    def _extract_competitor_signal(
        self,
        product,
        competitor,
        analysis_goal: str | None,
    ) -> LiveSourceResult:
        fetched_at = utcnow()
        goal = (
            "Analyze this competitor page against the user's product. Return JSON with these keys: "
            "summary, positioning, pricing_signal, differentiators, risks, trend_signals, market_signals. "
            f"User product name: {product.name}. "
        )
        if product.category:
            goal = f"{goal}User product category: {product.category}. "
        if analysis_goal:
            goal = f"{goal}Focus on this user goal: {analysis_goal}."

        try:
            raw_payload = TinyFishClient().run_automation(url=competitor.url, goal=goal)
            normalized_payload = {
                "summary": str(raw_payload.get("summary")).strip()
                if str(raw_payload.get("summary", "")).strip()
                else None,
                "positioning": str(raw_payload.get("positioning")).strip()
                if str(raw_payload.get("positioning", "")).strip()
                else None,
                "pricing_signal": str(raw_payload.get("pricing_signal")).strip()
                if str(raw_payload.get("pricing_signal", "")).strip()
                else None,
                "differentiators": ensure_string_list(raw_payload.get("differentiators", [])),
                "risks": ensure_string_list(raw_payload.get("risks", [])),
                "trend_signals": ensure_string_list(raw_payload.get("trend_signals", [])),
                "market_signals": ensure_string_list(raw_payload.get("market_signals", [])),
            }
            return LiveSourceResult(
                provider="tinyfish",
                source_type="competitor_page",
                source_url=str(competitor.url),
                status="completed",
                fetched_at=fetched_at,
                raw_payload=raw_payload,
                normalized_payload=normalized_payload,
            )
        except TinyFishConfigurationError as exc:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="competitor_page",
                source_url=str(competitor.url),
                status="failed",
                fetched_at=fetched_at,
                raw_payload=None,
                normalized_payload={},
                error_code="provider_not_configured",
                error_message=str(exc),
            )
        except TinyFishError as exc:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="competitor_page",
                source_url=str(competitor.url),
                status="failed",
                fetched_at=fetched_at,
                raw_payload=None,
                normalized_payload={},
                error_code="provider_request_failed",
                error_message=str(exc),
            )

    def create_analysis(self, user_id: int, product_id: int, payload: CompetitorAnalysisCreate):
        self._ensure_user_exists(user_id)
        product = self._get_product_or_404(user_id, product_id)

        competitor_ids = list(dict.fromkeys(payload.competitor_ids))
        competitors = self.competitor_repository.list_by_user_and_ids(user_id, competitor_ids)

        if len(competitors) != len(competitor_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more competitors do not belong to this user",
            )

        competitor_snapshots = [
            {"id": competitor.id, "name": competitor.name, "url": competitor.url}
            for competitor in competitors
        ]
        competitor_names = [competitor.name for competitor in competitors]
        evidence_results = [
            self._extract_competitor_signal(product, competitor, payload.analysis_goal)
            for competitor in competitors
        ]
        successful_results = [result for result in evidence_results if result.status == "completed"]

        pricing_signals = [
            str(result.normalized_payload.get("pricing_signal")).strip()
            for result in successful_results
            if str(result.normalized_payload.get("pricing_signal", "")).strip()
        ]
        differentiators = [
            str(item).strip()
            for result in successful_results
            for item in ensure_string_list(result.normalized_payload.get("differentiators", []))[:2]
            if str(item).strip()
        ]
        market_signals = [
            str(item).strip()
            for result in successful_results
            for item in ensure_string_list(result.normalized_payload.get("market_signals", []))[:2]
            if str(item).strip()
        ]
        trend_signals = [
            str(item).strip()
            for result in successful_results
            for item in ensure_string_list(result.normalized_payload.get("trend_signals", []))[:2]
            if str(item).strip()
        ]
        extracted_risks = [
            str(item).strip()
            for result in successful_results
            for item in ensure_string_list(result.normalized_payload.get("risks", []))[:2]
            if str(item).strip()
        ]
        sources_used, sources_failed = summarize_source_health(evidence_results)
        confidence_score = determine_confidence_score(
            completed_sources=len(sources_used),
            failed_sources=len(sources_failed),
            signal_count=len(pricing_signals) + len(differentiators) + len(market_signals) + len(trend_signals),
            has_primary_url=bool(product.url),
        )
        confidence_level = determine_confidence_level(confidence_score)
        data_freshness = determine_data_freshness(evidence_results)
        run_status = determine_run_status(evidence_results)

        if successful_results:
            summary = (
                f"{product.name} was compared against {len(competitors)} competitor"
                f"{'' if len(competitors) == 1 else 's'} with live page extraction from "
                f"{len(successful_results)} source{'s' if len(successful_results) != 1 else ''}: "
                f"{', '.join(competitor_names)}."
            )
        else:
            summary = (
                f"{product.name} was compared against {len(competitors)} competitor"
                f"{'' if len(competitors) == 1 else 's'}: {', '.join(competitor_names)}."
            )

        signal_count = len(pricing_signals) + len(market_signals) + len(trend_signals)
        if signal_count >= 6 or len(competitors) >= 4:
            market_position = "Highly competitive"
        elif signal_count >= 3 or len(competitors) >= 2:
            market_position = "Moderately competitive"
        else:
            market_position = "Emerging opportunity"

        strengths = [
            f"{product.name} can be positioned with a focused value proposition against {competitor_names[0]}.",
            "The saved product record gives a stable base for repeatable comparison runs.",
        ]
        strengths.extend(differentiators[:2])

        opportunities = [
            "Expand the product description to improve future analysis depth."
            if not product.description
            else "Use the current product description to drive clearer differentiation messaging.",
            "Track pricing and feature signals from competitor URLs in the next integration step.",
        ]
        if pricing_signals:
            opportunities.append(f"Pricing watchpoint: {pricing_signals[0]}")

        risks = [
            "Competitor URLs may change structure, which can affect automated extraction later.",
        ]
        if successful_results:
            risks.extend(extracted_risks[:2])
        else:
            risks.append("Live competitor extraction was unavailable, so this run has limited external evidence.")
        if sources_failed:
            risks.append("Some competitor sources failed, so pricing and positioning coverage is incomplete.")

        if not product.url:
            risks.append("The product does not yet have a URL, which limits direct page-level comparison.")

        recommendation = (
            f"Prioritize comparing {product.name} against {competitor_names[0]} first, "
            "then use the strongest pricing and market signals to refine positioning."
        )

        competition_score = clamp_score(25 + (len(competitors) * 10) + (len(market_signals) * 8))
        positioning_score = clamp_score(
            25 + (len(differentiators) * 12) + (10 if product.description else 0) + (confidence_score // 5)
        )
        pricing_pressure_score = clamp_score(20 + (len(pricing_signals) * 20))
        trend_score = clamp_score(20 + (len(trend_signals) * 18) + (len(market_signals) * 8))
        overall_score = clamp_score(
            round((competition_score + positioning_score + pricing_pressure_score + trend_score) / 4)
        )

        return self.repository.create(
            user_id=user_id,
            product_id=product_id,
            status=run_status,
            analysis_goal=payload.analysis_goal,
            summary=summary,
            market_position=market_position,
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
            evidence=build_evidence_payload(evidence_results),
            scoring_version="v2-live",
            recommendation=recommendation,
            competitor_ids=competitor_ids,
            competitor_snapshots=competitor_snapshots,
            strengths=strengths,
            opportunities=opportunities,
            risks=risks,
        )
