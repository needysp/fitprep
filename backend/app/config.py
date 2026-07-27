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
    # Comma-separated bootstrap admins: always allowed to sign in and always
    # granted the admin role, so the first admin can get in with no allowlist
    # row and can never be locked out.
    admin_emails: str = ""

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
