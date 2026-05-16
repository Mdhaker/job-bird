from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "JobBird"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "https://jobbird.vercel.app"]

    # Database (Supabase PostgreSQL)
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host:5432/db

    # Redis (Upstash)
    REDIS_URL: str  # redis://default:token@host:port

    # Celery
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    # Groq (free LLM inference)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Encryption key for storing LinkedIn credentials
    ENCRYPTION_KEY: str  # Fernet key — generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    # Scraper defaults
    SCRAPER_MIN_DELAY_S: float = 2.0
    SCRAPER_MAX_DELAY_S: float = 7.0
    SCRAPER_MAX_RETRIES: int = 3
    SCRAPER_PAGE_TIMEOUT_MS: int = 30000
    SCRAPER_SESSION_DIR: str = "/tmp/jobbird_sessions"

    # AI scoring thresholds
    AI_SCORE_KEEP_THRESHOLD: int = 60  # jobs >= this score go to "matched"

    def model_post_init(self, __context) -> None:
        if not self.CELERY_BROKER_URL:
            self.CELERY_BROKER_URL = self.REDIS_URL
        if not self.CELERY_RESULT_BACKEND:
            self.CELERY_RESULT_BACKEND = self.REDIS_URL


@lru_cache
def get_settings() -> Settings:
    return Settings()
