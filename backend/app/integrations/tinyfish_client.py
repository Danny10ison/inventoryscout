import time
from typing import Any

import httpx

from app.core.config import get_settings


class TinyFishError(Exception):
    pass


class TinyFishConfigurationError(TinyFishError):
    pass


class TinyFishClient:
    def __init__(self) -> None:
        self.settings = get_settings()

        if not self.settings.tinyfish_api_key:
            raise TinyFishConfigurationError("TinyFish API key is not configured")

        self.base_url = self.settings.tinyfish_base_url.rstrip("/")

    def run_automation(self, url: str, goal: str) -> dict[str, Any]:
        try:
            return self._run_with_retry(
                url=url,
                goal=goal,
                browser_profile=self.settings.tinyfish_browser_profile,
            )
        except TinyFishError as exc:
            if "blocked" not in str(exc).lower() or self.settings.tinyfish_browser_profile == "stealth":
                raise

        return self._run_with_retry(url=url, goal=goal, browser_profile="stealth")

    def _run_with_retry(self, *, url: str, goal: str, browser_profile: str) -> dict[str, Any]:
        attempts = 3
        last_error: TinyFishError | None = None

        for attempt in range(attempts):
            try:
                return self._run_once(url=url, goal=goal, browser_profile=browser_profile)
            except TinyFishError as exc:
                last_error = exc
                if "429" not in str(exc) or attempt == attempts - 1:
                    break
                time.sleep(2**attempt)

        raise last_error or TinyFishError("TinyFish request failed")

    def _run_once(self, *, url: str, goal: str, browser_profile: str) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "url": url,
            "goal": goal,
            "browser_profile": browser_profile,
            "api_integration": self.settings.tinyfish_api_integration,
        }

        if self.settings.tinyfish_proxy_enabled:
            payload["proxy_config"] = {
                "enabled": True,
                "country_code": self.settings.tinyfish_proxy_country_code,
            }

        with httpx.Client(timeout=self.settings.tinyfish_timeout_seconds) as client:
            response = client.post(
                f"{self.base_url}/v1/automation/run",
                headers={
                    "X-API-Key": self.settings.tinyfish_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            raise TinyFishError(
                f"TinyFish request failed with status {response.status_code}: {response.text}"
            )

        data = response.json()
        status = data.get("status")

        if status != "COMPLETED":
            error = data.get("error") or {}
            message = error.get("message") if isinstance(error, dict) else str(error)
            raise TinyFishError(message or "TinyFish automation failed")

        result = data.get("result")
        if not isinstance(result, dict):
            raise TinyFishError("TinyFish returned an unexpected result shape")

        return result
