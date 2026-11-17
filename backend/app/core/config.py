from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ResearchFlow Agent"
    llm_provider: str = "mock"
    google_api_key: str | None = None
    gemini_model: str | None = None
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"
    mock_llm: bool = True
    frontend_url: str = "http://localhost:5173"
    search_cache_ttl_seconds: int = 900
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
