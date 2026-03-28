from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.integrations.tinyfish_client import (
    TinyFishClient,
    TinyFishConfigurationError,
    TinyFishError,
    TinyFishTimeoutError,
)
from app.repositories.competitor_monitoring_repository import CompetitorMonitoringRepository
from app.repositories.competitor_repository import CompetitorRepository
from app.repositories.user_repository import UserRepository
from app.services.intelligence_pipeline import (
    LiveSourceResult,
    build_evidence_payload,
    clamp_score,
    determine_confidence_level,
    determine_confidence_score,
    determine_data_freshness,
    determine_run_status,
    extract_payload_list,
    extract_payload_text,
    summarize_source_health,
    utcnow,
)


class CompetitorMonitoringService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)
        self.competitor_repository = CompetitorRepository(db)
        self.repository = CompetitorMonitoringRepository(db)

    def _ensure_user_exists(self, user_id: int) -> None:
        if not self.user_repository.get_by_id(user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

    def _get_competitor_or_404(self, user_id: int, competitor_id: int):
        competitor = self.competitor_repository.get_by_user_and_id(user_id, competitor_id)
        if not competitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitor not found",
            )
        return competitor

    def _get_monitoring_run_or_404(self, user_id: int, competitor_id: int, monitoring_run_id: int):
        monitoring_run = self.repository.get_by_user_competitor_and_id(
            user_id,
            competitor_id,
            monitoring_run_id,
        )
        if not monitoring_run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitor monitoring run not found",
            )
        return monitoring_run

    def _run_monitoring_extraction(
        self,
        competitor,
        monitoring_goal: str | None,
    ) -> LiveSourceResult:
        fetched_at = utcnow()
        goal = (
            "Monitor this competitor page for notable market changes. Return JSON with these keys: "
            "summary, pricing_signal, market_signals, trend_signals, risks, recommendations, alert_level."
        )
        if monitoring_goal:
            goal = f"{goal} Focus on this user goal: {monitoring_goal}."

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

    def list_monitoring_runs(self, user_id: int, competitor_id: int):
        self._ensure_user_exists(user_id)
        self._get_competitor_or_404(user_id, competitor_id)
        return self.repository.list_by_user_and_competitor(user_id, competitor_id)

    def get_monitoring_run(self, user_id: int, competitor_id: int, monitoring_run_id: int):
        self._ensure_user_exists(user_id)
        self._get_competitor_or_404(user_id, competitor_id)
        return self._get_monitoring_run_or_404(user_id, competitor_id, monitoring_run_id)

    def create_monitoring_run(
        self,
        user_id: int,
        competitor_id: int,
        monitoring_goal: str | None = None,
    ):
        self._ensure_user_exists(user_id)
        competitor = self._get_competitor_or_404(user_id, competitor_id)
        result = self._run_monitoring_extraction(competitor, monitoring_goal)
        evidence_results = [result]
        payload = result.raw_payload if result.status == "completed" and isinstance(result.raw_payload, dict) else {}

        market_signals = extract_payload_list(payload, "market_signals")
        trend_signals = extract_payload_list(payload, "trend_signals")
        risks = extract_payload_list(payload, "risks")
        recommendations = extract_payload_list(payload, "recommendations", "next_steps")
        pricing_signal = extract_payload_text(payload, "pricing_signal")

        summary = (
            extract_payload_text(payload, "summary")
            or f"TinyFish could not complete monitoring for {competitor.name}. {result.error_message or 'No completed response was returned.'}"
        )

        sources_used, sources_failed = summarize_source_health(evidence_results)
        confidence_score = determine_confidence_score(
            completed_sources=len(sources_used),
            failed_sources=len(sources_failed),
            signal_count=len(market_signals) + len(trend_signals),
            has_primary_url=bool(competitor.url),
        )
        confidence_level = determine_confidence_level(confidence_score)
        data_freshness = determine_data_freshness(evidence_results)
        run_status = determine_run_status(evidence_results)

        pricing_change_score = clamp_score(20 + (25 if pricing_signal else 0) + (len(market_signals) * 10))
        market_activity_score = clamp_score(20 + (len(market_signals) * 14) + (len(trend_signals) * 12))
        risk_score = clamp_score(15 + (len(risks) * 20) + (10 if result.status != "completed" else 0))
        overall_score = clamp_score(
            round((pricing_change_score + market_activity_score + risk_score) / 3)
        )

        payload_alert_level = extract_payload_text(payload, "alert_level")
        if payload_alert_level:
            alert_level = payload_alert_level.title()
        elif overall_score >= 75:
            alert_level = "High"
        elif overall_score >= 50:
            alert_level = "Medium"
        else:
            alert_level = "Low"

        if not risks:
            risks = ["No critical risks were extracted in this monitoring run."]
        if result.status != "completed":
            risks.insert(
                0,
                "Live monitoring evidence is incomplete, so alerting should be treated as directional.",
            )
        if not recommendations:
            recommendations = ["Re-run monitoring later to build stronger competitor history signals."]

        return self.repository.create(
            user_id=user_id,
            competitor_id=competitor_id,
            status=run_status,
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
            evidence=build_evidence_payload(evidence_results),
            scoring_version="v2-live",
            market_signals=market_signals,
            trend_signals=trend_signals,
            risks=risks,
            recommendations=recommendations,
        )
