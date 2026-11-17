"""Settings, read once from environment variables (see PROJECT.md, section 9)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Storage: "memory" for tests and a quick local run, "dynamodb" everywhere else.
    storage: str = "memory"
    table_name: str = "squad"
    dynamodb_endpoint: str | None = None
    aws_region: str = "us-east-1"

    # Host sign-in (Amazon Cognito).
    cognito_region: str = "us-east-1"
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    # Locally only: accept "Bearer dev:<email>" instead of a real Cognito token.
    auth_dev_mode: bool = False

    cors_origins: str = "http://localhost:5173"

    # Payments (monobank personal API webhook).
    mono_webhook_secret: str = "change-me"
    mono_jar_url: str = ""
    premium_price_uah: int = 50
    # Every room plays this many games for free; after that a donation unlocks the rest.
    free_games: int = 2

    room_ttl_hours: int = 24

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
