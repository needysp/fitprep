# Fitness & Mealprep Personal Website — Build Plan

## Context

The user recently started going to the gym and doing meal prep, and wants a simple
personal website to support both habits. This is a greenfield project, scaffolded from scratch.

In v1 the user must sign in via an identity provider (**Google OIDC** to start), complete a
one-time **onboarding** (height, training goal, diet goal), and then use three core sections —
with all data stored **per authenticated user**:
1. **Training** — define a reusable **training plan / routine** (e.g. Push/Pull/Legs) with a planned
   exercise list, then log each workout day from it with basic input (sets, kg, reps). Each exercise
   links out to its page on fitundaktiv.de. Notes and a goal are recorded **per training day per
   exercise**, so the app builds a training history (per-day notes, goals, achievements/progress).
   Logging **prefills the previous session's** weights/reps, and a **bodyweight log** tracks progress
   over time against the diet goal.
2. **Recipes** — easy meal-prep recipes grouped by meal type (breakfast, lunch, dinner, snacks),
   starting with 4 choices each (16 total). Each recipe carries **macros** (calories + protein/carbs/fat).
3. **Shopping list** — a one-week shopping list aggregated from the chosen recipes, with tap-to-check-off
   items and the week's daily macro totals.

The whole UI is **mobile-responsive** (used at the gym and in the supermarket).

Explicitly deferred to a future iteration (but the foundation must not block them):
- **Auto-generated cheap recipes** based on current supermarket prices / Aktionen.
- **Additional IdPs** beyond Google (the OIDC flow is written generically so more can be added).

### Decisions (confirmed with user)
- **Stack:** separate frontend + backend. Frontend = React + Vite + TypeScript; Backend = Python FastAPI.
- **Storage:** SQLite (file-based) via SQLAlchemy — real persistence, workout history over time, per-user data.
- **Auth (v1):** OIDC login, **Google** as the first IdP. First login creates a `User`; a one-time
  **onboarding** captures the profile (height, training goal, diet goal) before the app is usable.
- **Scope:** auth + onboarding + all 3 core sections, **multi-user from the start** (every record is user-scoped).
- **Exercise info:** store a fitundaktiv.de link + the user's own short notes per exercise
  (do NOT copy their copyrighted descriptions/images).

## High-level architecture

```
fitprep/
  backend/
    app/
      main.py           # FastAPI app + session middleware + CORS for the Vite dev server
      config.py         # settings (Google client id/secret, session secret) from env
      database.py       # SQLAlchemy engine/session/Base (SQLite file: app.db)
      models.py         # ORM models (see data model below)
      schemas.py        # Pydantic request/response models
      auth.py           # OIDC (Google) login/callback/logout + current-user dependency
      routers/
        profile.py      # onboarding + read/update profile; bodyweight log
        exercises.py    # CRUD for exercise library
        routines.py     # training-plan templates (user-scoped)
        workouts.py     # log + query workout sessions/sets, prefill, history (user-scoped)
        recipes.py      # list/read recipes (with macros) by meal_type
        mealplan.py     # weekly plan + derived shopping list + check-off + macro totals (user-scoped)
      seed.py           # seed starter exercises + 16 recipes w/ macros (global catalog)
    requirements.txt
    .env.example        # GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / SESSION_SECRET
  frontend/
    index.html
    package.json, vite.config.ts, tsconfig.json
    src/
      main.tsx, App.tsx        # router + auth guard + top-level nav across 3 sections
      auth/AuthContext.tsx     # holds current user, redirects to login when unauthenticated
      api/client.ts            # typed fetch wrapper (sends session cookie) to the backend
      pages/
        LoginPage.tsx          # "Sign in with Google" button
        OnboardingPage.tsx     # first-login form: height, training goal, diet goal
        RoutinesPage.tsx       # create/edit training-plan templates
        TrainingPage.tsx       # start a day from a routine; set logger w/ prefill + history
        BodyweightPage.tsx     # log + view bodyweight over time
        RecipesPage.tsx        # meal-type tabs, 4 recipes each, with macros
        ShoppingListPage.tsx   # weekly plan selection + aggregated list w/ check-off + macro totals
      components/               # responsive layout; ExerciseCard, SetLogForm, RecipeCard, etc.
  README.md                    # how to run both halves + Google OAuth setup
```

Two processes in dev: FastAPI (uvicorn, e.g. :8000) and Vite (:5173). Vite proxies `/api`
to the backend so the frontend uses relative URLs (avoids CORS friction and mirrors prod).

### Auth flow (Google OIDC)

Uses **Authlib** on the backend for the OIDC dance and a signed **session cookie** (via Starlette
`SessionMiddleware`) to keep the user logged in — simplest robust option for a personal app.

1. Frontend `LoginPage` links to `GET /api/auth/login` → backend redirects to Google.
2. Google redirects back to `GET /api/auth/callback` → backend verifies the token, upserts a
   `User` (by Google `sub`/email), stores `user_id` in the session cookie, redirects to the frontend.
3. Frontend calls `GET /api/auth/me`; if the user has **no profile yet** → route to `OnboardingPage`,
   otherwise → the app. `POST /api/auth/logout` clears the session.

Every data endpoint depends on a `current_user` (from the session cookie) and filters/writes by
`user_id`, so users only ever see their own workouts, meal plans, and profile. The exercise +
recipe catalogs are global (seeded, shared by all users).

### Data model (SQLAlchemy, `models.py`)

- **User** — `id, oidc_sub, email, display_name, created_at` — one row per Google account (upserted on login)
- **UserProfile** — `id, user_id (FK, unique), height_cm, weight_kg, gender,
  training_goal, diet_goal` (enum lean_bulk/bulk/cut/custom) `+ diet_custom_text` — created during
  onboarding; its presence is how the app knows onboarding is complete
- **Exercise** — `id, name, muscle_group, fitundaktiv_url` (global catalog entry;
  `fitundaktiv_url` links out, no copyrighted content stored)
- **Routine** — `id, user_id (FK), name, description` — a reusable training-plan template
- **RoutineExercise** — `id, routine_id (FK), exercise_id (FK), position, target_sets, target_reps`
  — the planned exercise list for a routine
- **WorkoutSession** — `id, user_id (FK), routine_id (FK, nullable), date, notes` — one training day,
  optionally started from a routine (which pre-fills its exercises)
- **ExerciseLog** — `id, session_id (FK), exercise_id (FK), notes, goal` — one exercise done on that
  day, with the **per-day notes** and a **goal/target** the user set for it
- **WorkoutSet** — `id, exercise_log_id (FK), set_number, weight_kg, reps` — the actual logged sets
- **BodyweightEntry** — `id, user_id (FK), date, weight_kg` — bodyweight-over-time log
- **Recipe** — `id, title, meal_type` (enum: breakfast/lunch/dinner/snack), `servings, prep_minutes,
  instructions, calories, protein_g, carbs_g, fat_g` (global catalog; macros per serving)
- **Ingredient** — `id, recipe_id (FK), name, quantity, unit`
- **MealPlanItem** — `id, user_id (FK), week_start (date), meal_type, recipe_id (FK)` — a user's chosen recipes for the week
- **ShoppingCheck** — `id, user_id (FK), week_start (date), item_key` (e.g. `"oats|g"`), `checked`
  — persists the tap-to-check-off state overlaid on the derived list
- The **weekly shopping list** is *derived*, not stored: aggregate `Ingredient`s of all recipes
  in that user's current-week `MealPlanItem`s, summing `quantity` grouped by `(name, unit)`, then
  overlay `ShoppingCheck` state. The **week's daily macro totals** are likewise derived by summing
  recipe macros across the plan.

`User` owns `Routine`s, `WorkoutSession`s, `BodyweightEntry`s, `MealPlanItem`s, `ShoppingCheck`s
(and one `UserProfile`); the exercise and recipe catalogs are shared/global. The
Session → ExerciseLog → Set hierarchy is what makes the **training history** view possible: each
day groups the exercises trained, each carries its own notes + goal, and **achievements/progress**
(e.g. personal records — best weight×reps per exercise) are *derived* by querying `WorkoutSet`
history rather than stored redundantly. **Prefill** when logging is likewise derived: look up the
user's most recent `WorkoutSet`s for that exercise and pre-populate the form.

> Future-proofing (no work now, just leave room):
> - `User.oidc_sub` + a generic Authlib registration make adding more IdPs beyond Google straightforward.
> - `UserProfile.diet_goal` + workout data feed the future personalized / price-based recipe generator.
> - The ingredient-with-quantities model already supports cost computation for the
>   price-based recipe generator.

### API surface (v1)

- `GET /api/auth/login` (→ Google), `GET /api/auth/callback`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/profile` (complete onboarding), `GET/PUT /api/profile`
- `GET/POST /api/bodyweight` (log + list bodyweight over time)
- `GET/POST/PUT/DELETE /api/exercises`
- `GET/POST/PUT/DELETE /api/routines` (training-plan templates + their exercise lists)
- `POST /api/sessions` (start a training day, optionally `from_routine_id`), `GET /api/sessions` (history list),
  `GET /api/sessions/{id}` (a day with its exercise logs, notes, goals, sets)
- `POST /api/sessions/{id}/logs` (add an exercise log w/ notes+goal), `POST /api/logs/{id}/sets` (log a set)
- `GET /api/exercises/{id}/history` (per-exercise progress + PRs), `GET /api/exercises/{id}/prefill` (last set values)
- `GET /api/recipes?meal_type=`, `GET /api/recipes/{id}` (incl. macros)
- `GET/PUT /api/mealplan?week_start=` (choose recipes), `GET /api/shopping-list?week_start=`
  (aggregated + check state + daily macro totals), `PUT /api/shopping-list/check` (toggle an item)

All endpoints except `/api/auth/*` require an authenticated session and operate on the current user.

## Implementation steps

Built in **vertical slices** — each slice ships a fully usable backend+frontend piece and is verified
before the next starts.

**Slice 0 — Foundation (scaffold + auth + onboarding)**
1. Backend scaffold: `requirements.txt` (fastapi, uvicorn, sqlalchemy, pydantic, authlib,
   itsdangerous, httpx), `config.py`, `database.py`, `models.py` (all models), `schemas.py`,
   `main.py` with `SessionMiddleware`, CORS, routers mounted.
2. `auth.py`: Google OIDC via Authlib (`login`/`callback`/`logout`/`me`) + `current_user` dependency;
   `routers/profile.py` for onboarding + profile. `.env.example` + README Google-OAuth steps.
3. Frontend scaffold: Vite React+TS, responsive shell, `api/client.ts` (credentials: include),
   `AuthContext` + auth guard, Vite `/api` proxy; `LoginPage` + `OnboardingPage`.
   → **Verify:** sign in with Google, complete onboarding, land in the (empty) app.

**Slice 1 — Training (end-to-end)**
4. Backend: `seed.py` starter exercises (fitundaktiv links); `routers/exercises.py`, `routines.py`,
   `workouts.py` (sessions/logs/sets, `from_routine_id`, history+PRs, prefill); bodyweight endpoints.
5. Frontend: `RoutinesPage` (build a plan), `TrainingPage` (start a day from a routine, log sets with
   prefill, view history/PRs), `BodyweightPage`.
   → **Verify:** create a routine, log a day, confirm prefill + history + bodyweight persist per user.

**Slice 2 — Recipes (end-to-end)**
6. Backend: seed 16 recipes (4 per meal type) with ingredients + macros; `routers/recipes.py`.
7. Frontend: `RecipesPage` with meal-type tabs, cards showing ingredients, instructions, macros.
   → **Verify:** browse 4 recipes per meal type with correct macros.

**Slice 3 — Shopping list (end-to-end)**
8. Backend: `routers/mealplan.py` — weekly plan, derived aggregated shopping list, check-off state,
   daily macro totals.
9. Frontend: `ShoppingListPage` — pick recipes for the week, aggregated list with tap-to-check-off,
   week's macro totals.
   → **Verify:** select recipes, confirm aggregation, check-off persistence, and macro totals.

10. **README polish** — final setup/run instructions for both halves incl. Google OAuth client setup.

## Verification

Each slice is verified as it lands (see the → Verify notes above). Full end-to-end pass at the end:

- **Setup:** create a Google OAuth 2.0 client (redirect URI `http://localhost:8000/api/auth/callback`),
  copy `.env.example` → `.env`, fill client id/secret + a session secret.
- **Backend:** `cd backend && pip install -r requirements.txt && python -m app.seed` then
  `uvicorn app.main:app --reload`. Complete Google sign-in and confirm the callback creates a `User`
  + session cookie. Via Swagger (authenticated): complete onboarding; create a routine, start a day
  from it, log sets, confirm prefill/history/PRs; add a bodyweight entry; list recipes w/ macros;
  set a weekly meal plan, confirm the shopping list aggregates quantities, check-off persists, and
  daily macro totals are correct.
- **Frontend:** `cd frontend && npm install && npm run dev`. Sign in → onboarding → app. Build a
  routine, log a training day (prefill shows last values), log bodyweight; browse recipes with macros;
  pick a week's recipes and verify aggregated list, check-off, and macro totals. Verify layout is
  usable at a phone width. Log out and confirm the app is gated behind login again.
- **Isolation check:** sign in as a second Google account and confirm none of the first user's
  routines / workouts / meal plan are visible.
- **Persistence check:** restart the backend and confirm profile, routines, logged sets, bodyweight,
  meal plan, and check-off state survive (SQLite file).

## Out of scope (future iterations)
- **Additional identity providers** beyond Google (flow is written generically to allow more).
- Auto-generation of cheap recipes from live supermarket prices/Aktionen, personalized to the
  user's profile + diet goal.
- **MyFitnessPal API integration** (TODO) — pull the user's daily food logging from MyFitnessPal
  to complement recipes/nutrition tracking.
- **Weekly recipe recommendations** (TODO) — each week suggest 4 different recipes per meal type
  (breakfast/lunch/dinner), tailored to the user's **diet goal** (e.g. cut/bulk) and their
  **training plan**. Builds on the UserProfile/diet-goal + workout data already in the model.
