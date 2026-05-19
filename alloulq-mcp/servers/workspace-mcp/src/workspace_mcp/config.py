from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/alloulq"
    BACKEND_URL: str = "http://localhost:8000"
    BACKEND_SERVICE_TOKEN: str = ""
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"

    DAILYCO_API_KEY: str = ""
    DAILYCO_DOMAIN: str = ""

    MCP_TRANSPORT: str = "stdio"   # stdio | sse
    MCP_HOST: str = "0.0.0.0"
    MCP_PORT: int = 8010


@lru_cache
def get_settings() -> Settings:
    return Settings()
