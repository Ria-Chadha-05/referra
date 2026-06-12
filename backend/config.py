from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://referra:referra_secret@localhost:5432/referra"

    # ── Auth ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── External APIs ─────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    SEMANTIC_SCHOLAR_API_KEY: str = ""

    # ── AI Pipeline ───────────────────────────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    LLM_MODEL: str = "llama3-70b-8192"
    MAX_PAPERS_PER_CLAIM: int = 10
    TOP_REFS_TO_RETURN: int = 3

    # ── CORS — accepts a JSON array or comma-separated list ──────────────────
    # Example: CORS_ORIGINS=["https://referra.vercel.app","http://localhost:3000"]
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def model_post_init(self, __context) -> None:
        # Parse JSON list string if passed as env var e.g. '["https://...", "..."]'
        if isinstance(self.CORS_ORIGINS, str):
            s = self.CORS_ORIGINS.strip()
            if s.startswith("["):
                try:
                    parsed = json.loads(s)
                    object.__setattr__(self, "CORS_ORIGINS", parsed)
                    return
                except Exception:
                    pass
            # Comma-separated fallback
            object.__setattr__(self, "CORS_ORIGINS", [x.strip() for x in s.split(",") if x.strip()])


settings = Settings()
