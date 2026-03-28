from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass
class LiveSourceResult:
    provider: str
    source_type: str
    source_url: str
    status: str
    fetched_at: datetime
    raw_payload: dict[str, object] | None
    normalized_payload: dict[str, object]
    error_code: str | None = None
    error_message: str | None = None


def utcnow() -> datetime:
    return datetime.now(UTC)


def ensure_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []

    return [str(item).strip() for item in value if str(item).strip()]


def extract_payload_text(payload: dict[str, object], *keys: str) -> str | None:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def extract_payload_list(payload: dict[str, object], *keys: str) -> list[str]:
    for key in keys:
        value = payload.get(key)
        extracted = ensure_string_list(value)
        if extracted:
            return extracted
    return []


def get_completed_payloads(results: list[LiveSourceResult]) -> list[dict[str, object]]:
    return [
        result.raw_payload
        for result in results
        if result.status == "completed" and isinstance(result.raw_payload, dict)
    ]


def first_error_message(results: list[LiveSourceResult]) -> str | None:
    for result in results:
        if result.error_message:
            return result.error_message.strip()
    return None


def clamp_score(value: int) -> int:
    return max(0, min(100, value))


def summarize_source_health(results: list[LiveSourceResult]) -> tuple[list[str], list[str]]:
    sources_used = [f"{result.provider}:{result.source_type}" for result in results if result.status == "completed"]
    sources_failed = [
        f"{result.provider}:{result.source_type}:{result.error_code or 'unknown_error'}"
        for result in results
        if result.status != "completed"
    ]
    return sources_used, sources_failed


def determine_run_status(results: list[LiveSourceResult], *, minimum_completed_sources: int = 1) -> str:
    completed_count = sum(1 for result in results if result.status == "completed")

    if completed_count >= minimum_completed_sources:
        return "completed"
    if completed_count > 0:
        return "partial"
    return "failed"


def determine_data_freshness(results: list[LiveSourceResult]) -> str:
    completed_results = [result for result in results if result.status == "completed"]
    if not completed_results:
        return "stale"

    latest_fetch = max(result.fetched_at for result in completed_results)
    age_seconds = (utcnow() - latest_fetch).total_seconds()

    if age_seconds <= 3600:
        return "fresh"
    if age_seconds <= 86400:
        return "recent"
    return "stale"


def determine_confidence_score(
    *,
    completed_sources: int,
    failed_sources: int,
    signal_count: int,
    has_primary_url: bool,
) -> int:
    score = 15
    if has_primary_url:
        score += 15
    score += min(completed_sources * 20, 40)
    score += min(signal_count * 5, 25)
    score -= min(failed_sources * 10, 20)
    return clamp_score(score)


def determine_confidence_level(score: int) -> str:
    if score >= 75:
        return "High"
    if score >= 45:
        return "Medium"
    return "Low"


def build_evidence_payload(results: list[LiveSourceResult]) -> list[dict[str, object]]:
    return [
        {
            "provider": result.provider,
            "source_type": result.source_type,
            "source_url": result.source_url,
            "status": result.status,
            "fetched_at": result.fetched_at.isoformat(),
            "raw_payload": result.raw_payload,
            "normalized_payload": result.normalized_payload,
            "error_code": result.error_code,
            "error_message": result.error_message,
        }
        for result in results
    ]
