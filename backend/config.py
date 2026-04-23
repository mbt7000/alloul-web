from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Comma-separated default (matches previous list default). Env CORS_ORIGINS uses the same format.
_DEFAULT_CORS_ENV = (
    "http://localhost:3000,"
    "http://localhost:8081,"
    "http://127.0.0.1:8081,"
    "http://127.0.0.1:19006,"
    "http://localhost:19006"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env",
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite:///./app.db"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ENVIRONMENT: str = "development"
    # Stored as str so pydantic-settings does not json.loads() the .env value (comma-separated or JSON array).
    cors_origins_env: str = Field(default=_DEFAULT_CORS_ENV, validation_alias="CORS_ORIGINS")
    SEED_ADMIN_ENABLED: bool = False
    SEED_ADMIN_EMAIL: Optional[str] = None
    SEED_ADMIN_USERNAME: str = "admin"
    SEED_ADMIN_PASSWORD: Optional[str] = None

    # Optional second bootstrap user (e.g. second phone / non-admin QA). Requires SEED_SECOND_USER_* when enabled.
    SEED_SECOND_USER_ENABLED: bool = False
    SEED_SECOND_USER_EMAIL: Optional[str] = None
    SEED_SECOND_USER_USERNAME: str = "tester_b"
    SEED_SECOND_USER_PASSWORD: Optional[str] = None
    SEED_SECOND_USER_NAME: Optional[str] = None

    # Admin API (/admin/*) and is_admin on User responses. Comma-separated, case-insensitive.
    ADMIN_ALLOWED_EMAILS: str = ""
    ADMIN_USERNAMES: str = "admin,mbtalm1"

    # Firebase (optional – for POST /auth/firebase)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None

    # Stripe (subscriptions)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRICE_STARTER: Optional[str] = "price_1TPS2BGPIIEnFHbUv19A4YVu"   # $45/mo — 5 employees
    STRIPE_PRICE_PRO: Optional[str] = "price_1TPS2QGPIIEnFHbUifufCcWZ"       # $225/mo — 30 employees, 14d trial
    STRIPE_PRICE_PRO_PLUS: Optional[str] = None                               # Business — contact us
    FRONTEND_URL: str = "https://alloul.app"

    # Azure AD / Microsoft SSO (optional – for POST /auth/azure-ad)
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_TENANT_ID: Optional[str] = None

    # Azure Blob Storage (for file/image uploads)
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = None
    AZURE_STORAGE_CONTAINER: str = "uploads"

    # AI (Anthropic Claude)
    ANTHROPIC_API_KEY: Optional[str] = None

    # DeepSeek — OpenAI-compatible Chinese/Arabic LLM, used as Claude fallback.
    # Much cheaper than Claude (~10× less), strong on Arabic business tasks.
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Daily.co — غرف فيديو + شات داخل الجلسة (قسم الشركات)
    DAILY_API_KEY: Optional[str] = None
    # النطاق الفرعي فقط، مثال: alloul → https://alloul.daily.co
    DAILY_SUBDOMAIN: Optional[str] = None

    # Ollama (local AI)
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    OLLAMA_TIMEOUT: int = 120

    # Hugging Face
    HF_API_TOKEN: Optional[str] = None

    # ChromaDB (RAG embeddings)
    CHROMA_PERSIST_DIR: str = "/data/alloul-chroma"
    EMBEDDING_MODEL: str = "nomic-embed-text"

    # ALLOUL Agent (custom private SQL/data agent on the company server)
    ALLOUL_AGENT_URL: str = "http://34.147.168.15:8001"
    ALLOUL_AGENT_KEY: Optional[str] = None  # Set via ALLOUL_AGENT_KEY env var — never hardcode

    # AI System
    AI_DEFAULT_PROVIDER: str = "auto"  # auto, claude, ollama
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.3

    @computed_field
    @property
    def CORS_ORIGINS(self) -> list[str]:
        v = self.cors_origins_env.strip()
        if not v:
            return []
        if v.startswith("["):
            return json.loads(v)
        return [item.strip() for item in v.split(",") if item.strip()]


settings = Settings()
