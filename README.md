# FitPrep

Personal fitness + meal-prep app: training log, meal-prep recipes with macros, and a weekly
per-day meal plan that turns into an aggregated shopping list. See `PLAN.md` for the full
build plan and `stitch_base_design/` for the visual concept.

**Stack:** React + Vite + TypeScript + Tailwind (frontend) · FastAPI + SQLAlchemy + SQLite (backend) ·
Google sign-in (OIDC via Authlib) · Alembic migrations.

## Prerequisites

- Python 3.12+
- Node.js 20+ (LTS)
- A Google OAuth client (below)

## Google OAuth setup (one-time)

1. Open <https://console.cloud.google.com/apis/credentials> and create a project (e.g. "fitprep").
2. Configure the OAuth consent screen (External, add yourself as a test user).
3. Create an **OAuth client ID** of type **Web application**:
   - Authorized redirect URI (dev): `http://localhost:8000/api/auth/callback`
   - When deploying, add the production one: `https://<your-domain>/api/auth/callback`
4. Copy the client ID and secret into `backend/.env` (next section).

## Backend

```bash
cd backend
python3 -m venv .venv            # or: uv venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env             # fill in Google client id/secret + a random SESSION_SECRET
.venv/bin/alembic upgrade head   # creates/updates app.db
.venv/bin/uvicorn app.main:app --reload   # http://localhost:8000 (Swagger at /docs)
```

## Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxies /api to :8000)
```

Open <http://localhost:5173>, sign in with Google, complete onboarding.

## Notes

- All data is per-user; the exercise/recipe/ingredient catalogs are global and seeded
  (`python -m app.seed`, from Slice 1 onward).
- Schema changes go through Alembic: `alembic revision --autogenerate -m "..."` then
  `alembic upgrade head`.
- Deployment (Slice 5): FastAPI serves `frontend/dist` on one origin behind Caddy/HTTPS,
  `SECURE_COOKIES=true`, `FRONTEND_URL=https://<your-domain>`.
