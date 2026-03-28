from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "InventoryScout AI API"
    app_version: str = "1.0.0"
    database_url: str = "sqlite:///./inventoryscout.db"
    debug: bool = False
    sql_echo: bool = False
    tinyfish_api_key: str | None = None
    tinyfish_base_url: str = "https://agent.tinyfish.ai"
    tinyfish_browser_profile: str = "lite"
    tinyfish_proxy_enabled: bool = False
    tinyfish_proxy_country_code: str = "US"
    tinyfish_api_integration: str = "inventoryscout"
    auth_secret_key: str = "inventoryscout-dev-secret"
    auth_token_expiry_minutes: int = 480

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug", "dev", "development"}:
                return True
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
