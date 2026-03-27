import os
import time
from typing import Any

from tinyfish import (
    APIConnectionError,
    BrowserProfile,
    ProxyConfig,
    ProxyCountryCode,
    RateLimitError,
    RunStatus,
    SDKError,
    TinyFish,
)

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

        base_url = (self.settings.tinyfish_base_url or "").rstrip("/")
        self.base_url = base_url or "https://agent.tinyfish.ai"
        self._browser_profile = self._normalize_browser_profile(self.settings.tinyfish_browser_profile)
        self._proxy_config = self._build_proxy_config()
        self._client_kwargs = {
            "api_key": self.settings.tinyfish_api_key,
            "base_url": self.base_url,
            "timeout": float(self.settings.tinyfish_timeout_seconds),
            "max_retries": 0,
        }
        integration = (self.settings.tinyfish_api_integration or "").strip()
        if integration:
            os.environ["TF_API_INTEGRATION"] = integration

    def run_automation(self, url: str, goal: str) -> dict[str, Any]:
        try:
            return self._run_with_retry(url=url, goal=goal, browser_profile=self._browser_profile)
        except TinyFishError as exc:
            if "blocked" not in str(exc).lower() or self._browser_profile == BrowserProfile.STEALTH:
                raise

        return self._run_with_retry(url=url, goal=goal, browser_profile=BrowserProfile.STEALTH)

    def _run_with_retry(
        self,
        *,
        url: str,
        goal: str,
        browser_profile: BrowserProfile,
    ) -> dict[str, Any]:
        attempts = 3
        last_error: TinyFishError | None = None

        for attempt in range(attempts):
            try:
                return self._run_once(url=url, goal=goal, browser_profile=browser_profile)
            except TinyFishError as exc:
                last_error = exc
                if not self._should_retry(exc) or attempt == attempts - 1:
                    break
                time.sleep(2**attempt)

        raise last_error or TinyFishError("TinyFish request failed")

    def _run_once(
        self,
        *,
        url: str,
        goal: str,
        browser_profile: BrowserProfile,
    ) -> dict[str, Any]:
        client = TinyFish(**self._client_kwargs)
        try:
            response = client.agent.run(
                goal=goal,
                url=url,
                browser_profile=browser_profile,
                proxy_config=self._proxy_config,
            )
        except SDKError as exc:
            raise TinyFishError(str(exc)) from exc
        finally:
            client.close()

        if response.status != RunStatus.COMPLETED:
            message = response.error.message if response.error else f"TinyFish run finished with status {response.status}"
            raise TinyFishError(message)

        result = response.result
        if not isinstance(result, dict):
            raise TinyFishError("TinyFish returned an unexpected result shape")

        return result

    def _should_retry(self, exc: TinyFishError) -> bool:
        cause = getattr(exc, "__cause__", None)
        return isinstance(cause, (RateLimitError, APIConnectionError))

    def _normalize_browser_profile(self, profile: str | None) -> BrowserProfile:
        normalized = (profile or "").strip().lower() or "lite"
        try:
            return BrowserProfile(normalized)
        except ValueError as exc:
            raise TinyFishConfigurationError(
                f"TinyFish browser profile '{profile}' is not supported"
            ) from exc

    def _build_proxy_config(self) -> ProxyConfig | None:
        if not self.settings.tinyfish_proxy_enabled:
            return None

        country_code = (self.settings.tinyfish_proxy_country_code or "").strip()
        if not country_code:
            raise TinyFishConfigurationError(
                "Proxy country code is required when TinyFish proxying is enabled"
            )

        try:
            return ProxyConfig(enabled=True, country_code=ProxyCountryCode(country_code.upper()))
        except ValueError as exc:
            raise TinyFishConfigurationError(
                f"TinyFish proxy country code '{country_code}' is not supported"
            ) from exc
