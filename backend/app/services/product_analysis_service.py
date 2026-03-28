from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from urllib.parse import quote_plus

from app.repositories.competitor_repository import CompetitorRepository
from app.integrations.tinyfish_client import (
    TinyFishClient,
    TinyFishConfigurationError,
    TinyFishError,
    TinyFishTimeoutError,
)
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
    extract_payload_list,
    extract_payload_text,
    first_error_message,
    get_completed_payloads,
    summarize_source_health,
    utcnow,
)


class ProductAnalysisService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)
        self.product_repository = ProductRepository(db)
        self.competitor_repository = CompetitorRepository(db)
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

    def _run_tinyfish_competitor_market_analysis(
        self,
        product,
        competitor,
        analysis_goal: str | None,
    ) -> LiveSourceResult:
        fetched_at = utcnow()
        goal = (
            "Analyze this competitor product page to judge whether the user's product is worth selling in this market. "
            "Return JSON with these keys: summary, value_proposition, key_features, demand_signals, trend_signals, "
            "competitive_signals, risks. Keep arrays short and factual. "
            f"User product name: {product.name}. "
        )
        if product.category:
            goal = f"{goal}User product category: {product.category}. "
        if product.description:
            goal = f"{goal}User product description: {product.description}. "
        if analysis_goal:
            goal = f"{goal}Focus on this user goal: {analysis_goal}."

        try:
            raw_payload = TinyFishClient().run_automation(url=competitor.url, goal=goal)
            normalized_payload = dict(raw_payload)
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
        except TinyFishTimeoutError as exc:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="competitor_page",
                source_url=str(competitor.url),
                status="failed",
                fetched_at=fetched_at,
                raw_payload=None,
                normalized_payload={},
                error_code="provider_timeout",
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

    def _run_tinyfish_market_search(
        self,
        product,
        analysis_goal: str | None,
    ) -> LiveSourceResult:
        fetched_at = utcnow()
        search_query = " ".join(
            part
            for part in [product.name, product.category or "", "buy online"]
            if str(part).strip()
        ).strip()
        goal = (
            "Search the web for this product and inspect the top 3 relevant competitor or marketplace product pages. "
            "Return JSON with these keys: summary, value_proposition, key_features, demand_signals, trend_signals, "
            "competitive_signals, risks. Keep arrays short and factual. "
            f"User product name: {product.name}. "
        )
        if product.category:
            goal = f"{goal}User product category: {product.category}. "
        if product.description:
            goal = f"{goal}User product description: {product.description}. "
        if analysis_goal:
            goal = f"{goal}Focus on this user goal: {analysis_goal}."

        search_url = f"https://www.google.com/search?q={quote_plus(search_query)}"

        try:
            raw_payload = TinyFishClient().run_automation(url=search_url, goal=goal)
            normalized_payload = dict(raw_payload)
            return LiveSourceResult(
                provider="tinyfish",
                source_type="market_search",
                source_url=search_url,
                status="completed",
                fetched_at=fetched_at,
                raw_payload=raw_payload,
                normalized_payload=normalized_payload,
            )
        except TinyFishConfigurationError as exc:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="market_search",
                source_url=search_url,
                status="failed",
                fetched_at=fetched_at,
                raw_payload=None,
                normalized_payload={},
                error_code="provider_not_configured",
                error_message=str(exc),
            )
        except TinyFishTimeoutError as exc:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="market_search",
                source_url=search_url,
                status="failed",
                fetched_at=fetched_at,
                raw_payload=None,
                normalized_payload={},
                error_code="provider_timeout",
                error_message=str(exc),
            )
        except TinyFishError as exc:
            return LiveSourceResult(
                provider="tinyfish",
                source_type="market_search",
                source_url=search_url,
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
        competitors = self.competitor_repository.list_by_user_id(user_id)
        evidence_results: list[LiveSourceResult] = []

        if competitors:
            evidence_results.extend(
                self._run_tinyfish_competitor_market_analysis(product, competitor, payload.analysis_goal)
                for competitor in competitors
            )
        else:
            evidence_results.append(
                self._run_tinyfish_market_search(product, payload.analysis_goal)
            )

        has_description = bool(product.description and product.description.strip())
        has_category = bool(product.category and product.category.strip())
        completeness_score = sum([has_description, has_category])

        completed_payloads = get_completed_payloads(evidence_results)

        demand_signals = list(
            dict.fromkeys(
                str(item).strip()
                for payload_item in completed_payloads
                for item in extract_payload_list(payload_item, "demand_signals")
                if str(item).strip()
            )
        )
        trend_signals = list(
            dict.fromkeys(
                str(item).strip()
                for payload_item in completed_payloads
                for item in extract_payload_list(payload_item, "trend_signals")
                if str(item).strip()
            )
        )
        competitive_signals = list(
            dict.fromkeys(
                str(item).strip()
                for payload_item in completed_payloads
                for item in extract_payload_list(payload_item, "competitive_signals", "market_signals", "differentiators")
                if str(item).strip()
            )
        )
        extracted_risks = list(
            dict.fromkeys(
                str(item).strip()
                for payload_item in completed_payloads
                for item in extract_payload_list(payload_item, "risks")
                if str(item).strip()
            )
        )
        extracted_summary = next(
            (
                extract_payload_text(payload_item, "summary")
                for payload_item in completed_payloads
                if extract_payload_text(payload_item, "summary")
            ),
            None,
        )
        value_proposition = next(
            (
                extract_payload_text(payload_item, "value_proposition", "positioning")
                for payload_item in completed_payloads
                if extract_payload_text(payload_item, "value_proposition", "positioning")
            ),
            None,
        )
        key_features = list(
            dict.fromkeys(
                str(item).strip()
                for payload_item in completed_payloads
                for item in extract_payload_list(payload_item, "key_features", "differentiators")
                if str(item).strip()
            )
        )
        sources_used, sources_failed = summarize_source_health(evidence_results)
        signal_count = len(demand_signals) + len(trend_signals) + len(competitive_signals)
        confidence_score = determine_confidence_score(
            completed_sources=len(sources_used),
            failed_sources=len(sources_failed),
            signal_count=signal_count,
            has_primary_url=False,
        )
        confidence_level = determine_confidence_level(confidence_score)
        data_freshness = determine_data_freshness(evidence_results)
        run_status = determine_run_status(evidence_results)

        if len(demand_signals) + len(trend_signals) >= 4:
            demand_outlook = "Promising"
        elif len(demand_signals) + len(trend_signals) >= 2:
            demand_outlook = "Needs validation"
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

        if completed_payloads and (has_description or has_category):
            market_readiness = "High"
        elif completed_payloads:
            market_readiness = "Medium"
        elif completeness_score == 2:
            market_readiness = "Medium"
        else:
            market_readiness = "Early"

        error_message = first_error_message(evidence_results)

        if extracted_summary:
            summary = str(extracted_summary).strip()
        elif not completed_payloads:
            summary = (
                f"TinyFish could not complete a live analysis for {product.name}. "
                f"{error_message or 'All requested sources failed before returning a result.'}"
            )
        elif competitors:
            summary = (
                f"{product.name} was assessed against {len(competitors)} saved competitor "
                f"{'page' if len(competitors) == 1 else 'pages'} to estimate market viability."
            )
        else:
            summary = (
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
        if not demand_signals:
            gaps.append("Demand signals are still thin, so this product needs stronger external validation.")
        if not gaps:
            gaps.append("The core product fields are present, so the next gap is external market validation.")

        risks = [
            "Use confidence, freshness, and source coverage before treating this run as final market evidence.",
        ]
        if not completed_payloads:
            risks.insert(
                0,
                "TinyFish did not return a completed live analysis, so this run is backed by failure metadata rather than market evidence.",
            )
            if error_message:
                risks.insert(1, error_message)
        else:
            risks.extend(str(risk) for risk in extracted_risks[:3] if str(risk).strip())
        next_steps = [
            "Run competitor analysis with selected saved competitors for deeper positioning insight.",
            "Enrich this product with more descriptive attributes before connecting live analysis providers.",
        ]
        if trend_signals:
            next_steps.append("Validate the extracted trend signals with recent external sources and pricing checks.")
        if not competitors:
            next_steps.insert(0, "Add saved competitors if you want direct side-by-side checks instead of search-based market discovery.")

        goal_suffix = f" Focus area: {payload.analysis_goal}." if payload.analysis_goal else ""
        if not completed_payloads:
            recommendation = (
                "Retry this run after confirming the competitor URLs point to reachable product or search pages."
                f"{goal_suffix}"
            )
        elif not competitors:
            recommendation = (
                "This run used TinyFish web search to inspect top market results. Add saved competitors for tighter side-by-side checks."
                f"{goal_suffix}"
            )
        else:
            recommendation = (
                f"Use this product profile as the starting point for market validation and competitor benchmarking."
                f"{goal_suffix}"
            )

        demand_score = clamp_score(20 + (len(demand_signals) * 14) + (len(trend_signals) * 10))
        competition_score = clamp_score(
            15 + (len(competitive_signals) * 16) + (10 if has_category else 0)
        )
        trend_score = clamp_score(15 + (len(trend_signals) * 18) + (15 if completed_payloads else 0))
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
            value_proposition=value_proposition if isinstance(value_proposition, str) else None,
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
            evidence=build_evidence_payload(evidence_results),
            scoring_version="v2-live",
            recommendation=recommendation,
            strengths=strengths,
            gaps=gaps,
            risks=risks,
            next_steps=next_steps,
        )
