from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from . import auth
from .config import get_settings
from .routers import profile

settings = get_settings()

app = FastAPI(title="FitPrep API")

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    same_site="lax",
    https_only=settings.secure_cookies,
)
# In dev the Vite proxy makes most calls same-origin; CORS covers direct calls
# from the dev server origin. In prod FastAPI serves the frontend (same origin).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
