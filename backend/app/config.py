from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_client_id: str = ""
    google_client_secret: str = ""
    session_secret: str = "dev-secret-change-me"
    # Where the OAuth callback redirects the browser after login (Vite dev server
    # in dev, the public origin in prod).
    frontend_url: str = "http://localhost:5173"
    database_url: str = "sqlite:///./app.db"
    # Set true in prod (HTTPS) so the session cookie is marked Secure.
    secure_cookies: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
