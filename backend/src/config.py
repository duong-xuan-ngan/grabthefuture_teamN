# src/config.py
# BE Dev 1 owns this file.
# All environment variables are loaded once here; import `settings` everywhere else.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    port: int = 4000
    database_url: str

    jwt_secret: str
    jwt_expire_hours: int = 8

    # Optimization parameters
    co2_factor_kg_per_km: float = 0.21
    cluster_radius_meters: int = 200
    cluster_time_window_hours: int = 4
    high_priority_threshold: float = 6.0
    cluster_rerun_interval_seconds: int = 900


settings = Settings()
