from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.integrations.tinyfish_client import TinyFishClient, TinyFishConfigurationError, TinyFishError
from app.repositories.product_analysis_repository import ProductAnalysisRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.schemas.product_analysis import ProductAnalysisCreate
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


class ProductAnalysisService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)
        self.product_repository = ProductRepository(db)
        self.repository = ProductAnalysisRepository(db)

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
                detail="Product analysis not found",
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

    def _run_tinyfish_product_analysis(
        self,
        product,
        analysis_goal: str | None,
    ) -> LiveSourceResult:
        fetched_at = utcnow()
        if not product.url:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="product_page",
                source_url="",
                status="failed",
                fetched_at=fetched_at,
                raw_payload=None,
                normalized_payload={},
                error_code="missing_url",
                error_message="Product URL is required for live product analysis.",
            )

        goal = (
            "Analyze this product page for market opportunity. Return JSON with these keys: "
            "summary, target_customer, key_features, demand_signals, trend_signals, "
            "competitive_signals, risks, value_proposition. "
            "Keep arrays short and factual."
        )
        if analysis_goal:
            goal = f"{goal} Focus on this user goal: {analysis_goal}."

        try:
            raw_payload = TinyFishClient().run_automation(url=product.url, goal=goal)
            normalized_payload = {
                "summary": str(raw_payload.get("summary")).strip()
                if str(raw_payload.get("summary", "")).strip()
                else None,
                "value_proposition": str(raw_payload.get("value_proposition")).strip()
                if str(raw_payload.get("value_proposition", "")).strip()
                else None,
                "key_features": ensure_string_list(raw_payload.get("key_features", [])),
                "demand_signals": ensure_string_list(raw_payload.get("demand_signals", [])),
                "trend_signals": ensure_string_list(raw_payload.get("trend_signals", [])),
                "competitive_signals": ensure_string_list(raw_payload.get("competitive_signals", [])),
                "risks": ensure_string_list(raw_payload.get("risks", [])),
            }
            return LiveSourceResult(
                provider="tinyfish",
                source_type="product_page",
                source_url=str(product.url),
                status="completed",
                fetched_at=fetched_at,
                raw_payload=raw_payload,
                normalized_payload=normalized_payload,
            )
        except TinyFishConfigurationError as exc:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="product_page",
                source_url=str(product.url),
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
                source_type="product_page",
                source_url=str(product.url),
                status="failed",
                fetched_at=fetched_at,
                raw_payload=None,
                normalized_payload={},
                error_code="provider_request_failed",
                error_message=str(exc),
            )

    def create_analysis(self, user_id: int, product_id: int, payload: ProductAnalysisCreate):
        self._ensure_user_exists(user_id)
        product = self._get_product_or_404(user_id, product_id)
        source_result = self._run_tinyfish_product_analysis(product, payload.analysis_goal)
        evidence_results = [source_result]

        has_description = bool(product.description and product.description.strip())
        has_category = bool(product.category and product.category.strip())
        has_url = bool(product.url and str(product.url).strip())
        completeness_score = sum([has_description, has_category, has_url])

        live_payload = source_result.normalized_payload if source_result.status == "completed" else {}
        demand_signals = ensure_string_list(live_payload.get("demand_signals", []))
        trend_signals = ensure_string_list(live_payload.get("trend_signals", []))
        competitive_signals = ensure_string_list(live_payload.get("competitive_signals", []))
        extracted_risks = ensure_string_list(live_payload.get("risks", []))
        extracted_summary = live_payload.get("summary") if isinstance(live_payload.get("summary"), str) else None
        value_proposition = (
            live_payload.get("value_proposition")
            if isinstance(live_payload.get("value_proposition"), str)
            else None
        )
        key_features = ensure_string_list(live_payload.get("key_features", []))
        sources_used, sources_failed = summarize_source_health(evidence_results)
        signal_count = len(demand_signals) + len(trend_signals) + len(competitive_signals)
        confidence_score = determine_confidence_score(
            completed_sources=len(sources_used),
            failed_sources=len(sources_failed),
            signal_count=signal_count,
            has_primary_url=has_url,
        )
        confidence_level = determine_confidence_level(confidence_score)
        data_freshness = determine_data_freshness(evidence_results)
        run_status = determine_run_status(evidence_results)

        if len(demand_signals) + len(trend_signals) >= 4:
            demand_outlook = "Promising"
        elif len(demand_signals) + len(trend_signals) >= 2:
            demand_outlook = "Needs validation"
        elif completeness_score == 3:
            demand_outlook = "Promising"
        elif completeness_score == 2:
            demand_outlook = "Needs validation"
        else:
            demand_outlook = "Unclear"

        if len(competitive_signals) >= 4:
            competition_level = "High"
        elif len(competitive_signals) >= 2:
            competition_level = "Moderate"
        elif completeness_score >= 2:
            competition_level = "Moderate"
        else:
            competition_level = "Unknown"

        if source_result.status == "completed" and completeness_score >= 2:
            market_readiness = "High"
        elif completeness_score == 2:
            market_readiness = "Medium"
        else:
            market_readiness = "Early"

        summary = extracted_summary or (
            f"{product.name} shows {market_readiness.lower()} market readiness based on the current "
            "product information available in InventoryScout."
        )

        strengths = [
            f"{product.name} is now stored as a reusable product record for repeatable analysis.",
            "The current product profile can serve as a baseline for future competitor and market comparisons.",
        ]
        if has_category:
            strengths.append(f"The selected category '{product.category}' gives the analysis better context.")
        if isinstance(value_proposition, str) and value_proposition.strip():
            strengths.append(f"Value proposition signal: {value_proposition.strip()}")
        if isinstance(key_features, list):
            strengths.extend(str(feature) for feature in key_features[:2] if str(feature).strip())

        gaps = []
        if not has_description:
            gaps.append("Add a richer product description to improve positioning and value analysis.")
        if not has_category:
            gaps.append("Assign a product category to support cleaner market and competitor comparisons.")
        if not has_url:
            gaps.append("Add a product URL so later analysis can compare page-level details and messaging.")
        if not demand_signals and has_url:
            gaps.append("Demand signals are still thin, so this product needs stronger external validation.")
        if not gaps:
            gaps.append("The core product fields are present, so the next gap is external market validation.")

        risks = [
            "Use confidence, freshness, and source coverage before treating this run as final market evidence.",
        ]
        if source_result.status != "completed":
            risks.insert(
                0,
                "Live product extraction did not fully complete, so this run is only partially backed by external evidence.",
            )
        else:
            risks.extend(str(risk) for risk in extracted_risks[:3] if str(risk).strip())
        if not has_url:
            risks.append("Missing a product URL limits direct page comparison and content extraction.")

        next_steps = [
            "Run competitor analysis with selected saved competitors for deeper positioning insight.",
            "Enrich this product with more descriptive attributes before connecting live analysis providers.",
        ]
        if has_url:
            next_steps.append("Use the product URL as an input for future extraction and comparison workflows.")
        if trend_signals:
            next_steps.append("Validate the extracted trend signals with recent external sources and pricing checks.")

        goal_suffix = f" Focus area: {payload.analysis_goal}." if payload.analysis_goal else ""
        recommendation = (
            f"Use this product profile as the starting point for market validation and competitor benchmarking."
            f"{goal_suffix}"
        )

        demand_score = clamp_score(20 + (len(demand_signals) * 14) + (len(trend_signals) * 10))
        competition_score = clamp_score(
            15 + (len(competitive_signals) * 16) + (10 if has_category else 0) + (10 if has_url else 0)
        )
        trend_score = clamp_score(15 + (len(trend_signals) * 18) + (15 if source_result.status == "completed" else 0))
        opportunity_score = clamp_score(
            20 + (confidence_score // 2) + (10 if has_description else 0) + (10 if has_category else 0)
        )
        overall_score = clamp_score(
            round((demand_score + competition_score + trend_score + opportunity_score) / 4)
        )

        return self.repository.create(
            user_id=user_id,
            product_id=product_id,
            status=run_status,
            analysis_goal=payload.analysis_goal,
            summary=summary,
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
            evidence=build_evidence_payload(evidence_results),
            scoring_version="v2-live",
            recommendation=recommendation,
            strengths=strengths,
            gaps=gaps,
            risks=risks,
            next_steps=next_steps,
        )
