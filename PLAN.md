# Fitness & Mealprep Personal Website — Build Plan

## Context

The user recently started going to the gym and doing meal prep, and wants a simple
personal website to support both habits. This is a greenfield project, scaffolded from scratch.

In v1 the user must sign in via an identity provider (**Google OIDC** to start), complete a
one-time **onboarding** (height, training goal, diet goal, starting bodyweight), and then use the
app — with all data stored **per authenticated user**:
1. **Training** — define a reusable **training plan / routine** (e.g. Push/Pull/Legs) with a planned
   exercise list, then log each workout day from it with basic input (sets, kg, reps). Each exercise
   links out to its page on fitundaktiv.de. Notes and a goal are recorded **per training day per
   exercise**, so the app builds a training history (per-day notes, goals, achievements/progress).
   Logging **prefills the previous session's** weights/reps, sessions track **duration**
   (started/finished timestamps), and a **bodyweight log** tracks progress over time against the diet goal.
2. **Recipes** — easy meal-prep recipes grouped by meal type (breakfast, lunch, dinner, snacks),
   starting with 4 choices each (16 total). Each recipe carries **macros** (calories + protein/carbs/fat),
   **tags** (e.g. High Protein, Vegan, Quick Prep), and an optional **photo**.
3. **Shopping list** — a one-week shopping list aggregated from the week's **per-day meal plan**,
   grouped by supermarket department (Produce / Protein / Pantry / …), with tap-to-check-off items,
   Clear-All + Print, and the week's daily macro totals.
4. **Dashboard** — slim home screen composed only of data the app already has: last workout summary,
   weekly activity, bodyweight trend, and today's planned meals.

The whole UI is **mobile-responsive** (used at the gym and in the supermarket): desktop gets the
sidebar layout from the design mocks, phones get a **bottom tab bar**.

Explicitly deferred to a future iteration (but the foundation must not block them):
- **Discount-aware weekly compile** — when composing the week's meal plan + shopping list, weigh in
  the current supermarket discounts (Aktionen) to recommend the best-value recipe set (see Out of scope).
- **Additional IdPs** beyond Google (the OIDC flow is written generically so more can be added).

### Design reference (`stitch_base_design/`)

A first visual concept ("AuraFitness") was generated with Google Stitch: four desktop screen mocks
plus a design system in `stitch_base_design/aura/DESIGN.md`. How to use it:
- The **styling and color scheme are binding**: lift the Aura tokens (colors, Inter typography,
  radii, spacing) into the Tailwind theme. Primary accent is **`#d97757`** (the mocks use it;
  where DESIGN.md's frontmatter disagrees, the mocks win).
- The `code.html` files are Tailwind-CDN static mockups — **visual reference only**, not code to port.
- The mocks are desktop-first; the mobile layout (bottom tab bar, stacked cards) is designed during
  the build since phone use is the primary context.
- The mock dashboard's "nutrition consistency / meals tracked" card is **dropped** for now — it
  implies meal logging, which doesn't exist yet (see MyFitnessPal in Out of scope).

### Decisions (confirmed with user)
- **Stack:** separate frontend + backend. Frontend = React + Vite + TypeScript + **Tailwind CSS**
  (Aura design tokens in the theme); Backend = Python FastAPI.
- **Storage:** SQLite (file-based) via SQLAlchemy — real persistence, workout history over time,
  per-user data. **Alembic migrations from day one** (workout history must survive schema changes).
- **Auth (v1):** OIDC login, **Google** as the first IdP. First login creates a `User`; a one-time
  **onboarding** captures the profile before the app is usable.
- **Scope:** auth + onboarding + all sections above, **multi-user from the start** (every record is user-scoped).
- **Exercise info:** store a fitundaktiv.de link + the user's own short notes per exercise
  (do NOT copy their copyrighted descriptions/images).
- **Ingredients are a canonical catalog**, not free text: recipes reference `IngredientItem` rows
  (with a supermarket-department category). This makes shopping-list aggregation robust, enables the
  department grouping from the design, and is the join point for future discount/price data.
- **Meal plan is per-day:** each `MealPlanItem` is one recipe in one `day_of_week` + `meal_type`
  slot, so servings scaling and daily macro totals are well-defined.
- **Single source of truth for weight:** the profile stores height/goals only; current weight is
  the latest `BodyweightEntry` (onboarding creates the first entry).
- **Week convention:** `week_start` is always the **ISO Monday** of the week, validated server-side.
- **Deployment is part of v1** (the app is used on a phone in the gym/supermarket, so localhost-only
  is not usable): single container where FastAPI serves the built frontend, SQLite on a volume,
  HTTPS via Caddy on a small VPS.

## High-level architecture

```
fitprep/
  backend/
    app/
      main.py           # FastAPI app + session middleware + CORS for the Vite dev server
                        # (in prod also serves the built frontend as static files)
      config.py         # settings (Google client id/secret, session secret, FRONTEND_URL) from env
      database.py       # SQLAlchemy engine/session/Base (SQLite file: app.db)
      models.py         # ORM models (see data model below)
      schemas.py        # Pydantic request/response models
      auth.py           # OIDC (Google) login/callback/logout + current-user dependency
      routers/
        profile.py      # onboarding + read/update profile; bodyweight log
        exercises.py    # CRUD for exercise library
        routines.py     # training-plan templates (user-scoped)
        workouts.py     # log + query workout sessions/sets, prefill, history (user-scoped)
        recipes.py      # list/read recipes (macros, tags, image) by meal_type
        mealplan.py     # per-day weekly plan + derived shopping list + check-off + macro totals
        dashboard.py    # summary endpoint: last session, weekly activity, bodyweight trend, today's meals
      seed.py           # seed starter exercises + ingredient catalog + 16 recipes w/ macros (global)
    alembic/            # migrations (init in Slice 0, autogenerate per schema change)
    requirements.txt
    .env.example        # GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / SESSION_SECRET / FRONTEND_URL
  frontend/
    index.html
    package.json, vite.config.ts, tsconfig.json, tailwind.config.ts  # Aura tokens in the theme
    src/
      main.tsx, App.tsx        # router + auth guard + responsive nav (sidebar / bottom tab bar)
      auth/AuthContext.tsx     # holds current user, redirects to login when unauthenticated
      api/client.ts            # typed fetch wrapper (sends session cookie) to the backend
      pages/
        LoginPage.tsx          # "Sign in with Google" button
        OnboardingPage.tsx     # first-login form: height, goals, starting bodyweight
        DashboardPage.tsx      # home: last session, weekly activity, bodyweight trend, today's meals
        RoutinesPage.tsx       # create/edit training-plan templates
        TrainingPage.tsx       # start a day from a routine; set logger w/ prefill + history + duration
        BodyweightPage.tsx     # log + view bodyweight over time (reachable from Dashboard/Training)
        RecipesPage.tsx        # meal-type tabs, recipe cards w/ tags, macros, photo (graceful w/o image)
        ShoppingListPage.tsx   # per-day weekly plan grid + aggregated list by department
                               # w/ check-off, Clear All, Print
        SettingsPage.tsx       # edit profile (height, goals) after onboarding
      components/               # responsive layout; ExerciseCard, SetLogForm, RecipeCard, BottomNav, etc.
  stitch_base_design/           # Stitch concept (visual reference; Aura tokens are the source of truth)
  README.md                    # how to run both halves + Google OAuth setup + deployment
```

Two processes in dev: FastAPI (uvicorn, e.g. :8000) and Vite (:5173). Vite proxies `/api`
to the backend so the frontend uses relative URLs (avoids CORS friction and mirrors prod,
where FastAPI serves the built frontend from the same origin).

### Auth flow (Google OIDC)

Uses **Authlib** on the backend for the OIDC dance and a signed **session cookie** (via Starlette
`SessionMiddleware`) to keep the user logged in — simplest robust option for a personal app.

1. Frontend `LoginPage` links to `GET /api/auth/login` → backend redirects to Google.
2. Google redirects back to `GET /api/auth/callback` → backend verifies the token, upserts a
   `User` (by Google `sub`/email), stores `user_id` in the session cookie, redirects to
   **`FRONTEND_URL`** (config, not hardcoded — differs between dev `:5173` and prod).
3. Frontend calls `GET /api/auth/me`; if the user has **no profile yet** → route to `OnboardingPage`,
   otherwise → the app. `POST /api/auth/logout` clears the session.

The Google OAuth client needs **both** redirect URIs registered: the localhost one for dev and the
production domain one. In prod the session cookie is `Secure` (HTTPS via Caddy).

Every data endpoint depends on a `current_user` (from the session cookie) and filters/writes by
`user_id`, so users only ever see their own workouts, meal plans, and profile. The exercise,
ingredient, and recipe catalogs are global (seeded, shared by all users).

### Data model (SQLAlchemy, `models.py`)

- **User** — `id, oidc_sub, email, display_name, created_at` — one row per Google account (upserted on login)
- **UserProfile** — `id, user_id (FK, unique), height_cm, gender, training_goal, diet_goal`
  (enum lean_bulk/bulk/cut/custom) `+ diet_custom_text` — created during onboarding; its presence is
  how the app knows onboarding is complete. **No weight field** — current weight is the latest
  `BodyweightEntry`; onboarding creates the first one.
- **Exercise** — `id, name, muscle_group, fitundaktiv_url` (global catalog entry;
  `fitundaktiv_url` links out, no copyrighted content stored)
- **Routine** — `id, user_id (FK), name, description` — a reusable training-plan template
- **RoutineExercise** — `id, routine_id (FK), exercise_id (FK), position, target_sets, target_reps`
  — the planned exercise list for a routine
- **WorkoutSession** — `id, user_id (FK), routine_id (FK, nullable), date, notes,
  started_at, finished_at (nullable)` — one training day, optionally started from a routine (which
  pre-fills its exercises). **Duration** is derived from the timestamps; **total volume**
  (Σ weight×reps) is derived from the sets — neither is stored.
- **ExerciseLog** — `id, session_id (FK), exercise_id (FK), notes, goal` — one exercise done on that
  day, with the **per-day notes** and a **goal/target** the user set for it
- **WorkoutSet** — `id, exercise_log_id (FK), set_number, weight_kg, reps` — the actual logged sets
- **BodyweightEntry** — `id, user_id (FK), date, weight_kg` — bodyweight-over-time log (first entry
  from onboarding)
- **Recipe** — `id, title, meal_type` (enum: breakfast/lunch/dinner/snack), `servings, prep_minutes,
  instructions, calories, protein_g, carbs_g, fat_g, tags (JSON list of strings),
  image_url (nullable)` (global catalog; macros per serving; cards render gracefully without image)
- **IngredientItem** — `id, name (canonical, unique), category` (enum: produce/protein/dairy/
  pantry/frozen/other) `, default_unit` — global ingredient catalog. Canonical names + IDs (instead
  of free text) make aggregation robust, drive the department grouping in the shopping list, and are
  the future join point for supermarket offer data.
- **RecipeIngredient** — `id, recipe_id (FK), ingredient_item_id (FK), quantity, unit`
- **MealPlanItem** — `id, user_id (FK), week_start (date, ISO Monday), day_of_week (0–6, 0 = Monday),
  meal_type, recipe_id (FK)` — one recipe planned for one day's meal slot. One recipe per
  (day, meal_type) slot for breakfast/lunch/dinner (UI-enforced); snacks may repeat.
- **ShoppingCheck** — `id, user_id (FK), week_start (date), ingredient_item_id (FK), checked`
  — persists the tap-to-check-off state overlaid on the derived list (keyed by ingredient ID,
  not by name string, so recipe edits can't orphan it)
- The **weekly shopping list** is *derived*, not stored: for the user's `MealPlanItem`s of that week,
  count planned servings per recipe (one item = one serving), scale each `RecipeIngredient` by
  `planned_servings / recipe.servings`, sum grouped by `(ingredient_item, unit)`, group the result
  by `IngredientItem.category` for display, then overlay `ShoppingCheck` state. The **daily macro
  totals** are likewise derived: per `day_of_week`, sum the per-serving macros of that day's items.
- `week_start` is validated server-side to be a Monday.

`User` owns `Routine`s, `WorkoutSession`s, `BodyweightEntry`s, `MealPlanItem`s, `ShoppingCheck`s
(and one `UserProfile`); the exercise, ingredient, and recipe catalogs are shared/global. The
Session → ExerciseLog → Set hierarchy is what makes the **training history** view possible: each
day groups the exercises trained, each carries its own notes + goal, and **achievements/progress**
(e.g. personal records — best weight×reps per exercise) are *derived* by querying `WorkoutSet`
history rather than stored redundantly. **Prefill** when logging is likewise derived: look up the
user's most recent `WorkoutSet`s for that exercise and pre-populate the form.

> Future-proofing (no work now, just leave room):
> - `User.oidc_sub` + a generic Authlib registration make adding more IdPs beyond Google straightforward.
> - `UserProfile.diet_goal` + workout data feed the future recipe recommendations.
> - The **discount-aware weekly compile** plugs into the ingredient catalog: a future
>   `StoreOffer (week_start, ingredient_item_id, store, price, discount_pct)` table lets the app
>   score the *existing* recipes by how many of their ingredients are on Aktion this week and
>   recommend the best-value plan — no schema change to recipes or meal plan needed.

### API surface (v1)

- `GET /api/auth/login` (→ Google), `GET /api/auth/callback`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/profile` (complete onboarding incl. starting bodyweight), `GET/PUT /api/profile`
- `GET/POST /api/bodyweight` (log + list bodyweight over time)
- `GET/POST/PUT/DELETE /api/exercises`
- `GET/POST/PUT/DELETE /api/routines` (training-plan templates + their exercise lists)
- `POST /api/sessions` (start a training day, optionally `from_routine_id`; sets `started_at`),
  `PUT /api/sessions/{id}/finish` (sets `finished_at`), `GET /api/sessions` (history list),
  `GET /api/sessions/{id}` (a day with its exercise logs, notes, goals, sets, duration, volume)
- `POST /api/sessions/{id}/logs` (add an exercise log w/ notes+goal), `POST /api/logs/{id}/sets` (log a set)
- `GET /api/exercises/{id}/history` (per-exercise progress + PRs), `GET /api/exercises/{id}/prefill` (last set values)
- `GET /api/recipes?meal_type=`, `GET /api/recipes/{id}` (incl. macros, tags, ingredients)
- `GET/PUT /api/mealplan?week_start=` (the week's per-day recipe grid),
  `GET /api/shopping-list?week_start=` (aggregated by department + check state + daily macro totals),
  `PUT /api/shopping-list/check` (toggle an item by `ingredient_item_id`),
  `POST /api/shopping-list/clear?week_start=` (Clear All — uncheck everything)
- `GET /api/dashboard` (last session summary, workouts + total time this week, bodyweight trend,
  today's planned meals)

All endpoints except `/api/auth/*` require an authenticated session and operate on the current user.

## Implementation steps

Built in **vertical slices** — each slice ships a fully usable backend+frontend piece and is verified
before the next starts.

**Slice 0 — Foundation (scaffold + auth + onboarding)**
1. Backend scaffold: `requirements.txt` (fastapi, uvicorn, sqlalchemy, **alembic**, pydantic, authlib,
   itsdangerous, httpx), `config.py` (incl. `FRONTEND_URL`), `database.py`, `models.py` (all models),
   `schemas.py`, `main.py` with `SessionMiddleware`, CORS, routers mounted.
   **Alembic init + initial migration** (schema changes are migrations from here on).
2. `auth.py`: Google OIDC via Authlib (`login`/`callback`/`logout`/`me`) + `current_user` dependency;
   `routers/profile.py` for onboarding (creates profile + first `BodyweightEntry`) + profile
   read/update. `.env.example` + README Google-OAuth steps (register both dev + prod redirect URIs).
3. Frontend scaffold: Vite React+TS + Tailwind with the **Aura design tokens** (colors incl. primary
   `#d97757`, Inter, radii, spacing) in `tailwind.config.ts`; responsive shell — **desktop sidebar +
   mobile bottom tab bar**; `api/client.ts` (credentials: include), `AuthContext` + auth guard,
   Vite `/api` proxy; `LoginPage` + `OnboardingPage`.
   → **Verify:** sign in with Google, complete onboarding, land in the (empty) app; shell renders
   correctly at phone width (bottom tab bar) and desktop (sidebar).

**Slice 1 — Training (end-to-end)**
4. Backend: `seed.py` starter exercises (fitundaktiv links); `routers/exercises.py`, `routines.py`,
   `workouts.py` (sessions/logs/sets, `from_routine_id`, start/finish timestamps, history+PRs,
   prefill, derived duration + volume); bodyweight endpoints.
5. Frontend: `RoutinesPage` (build a plan), `TrainingPage` (start a day from a routine, log sets with
   prefill, finish the session, view history/PRs with duration + volume), `BodyweightPage`.
   → **Verify:** create a routine, log a day, confirm prefill + history + duration/volume + bodyweight
   persist per user.

**Slice 2 — Recipes (end-to-end)**
6. Backend: seed the **ingredient catalog** (canonical names + department categories) and 16 recipes
   (4 per meal type) referencing it, with macros, tags, and image URLs where available (own/free-stock
   photos only); `routers/recipes.py`.
7. Frontend: `RecipesPage` with meal-type tabs, cards showing photo (graceful without), tags,
   ingredients, instructions, macros.
   → **Verify:** browse 4 recipes per meal type with correct macros, tags render, cards without
   images degrade cleanly.

**Slice 3 — Meal plan + shopping list (end-to-end)**
8. Backend: `routers/mealplan.py` — per-day weekly plan (`week_start` = ISO Monday, validated),
   derived shopping list (servings-scaled, grouped by department), check-off state by ingredient ID,
   Clear All, daily macro totals.
9. Frontend: `ShoppingListPage` — day × meal-type grid to pick the week's recipes, aggregated list
   grouped by department with tap-to-check-off, **Clear All** and **Print** (print stylesheet),
   daily macro totals.
   → **Verify:** plan a week incl. one recipe eaten on several days, confirm quantities scale with
   servings, department grouping, check-off + Clear All persistence, print view, and per-day macro totals.

**Slice 4 — Dashboard + settings**
10. Backend: `routers/dashboard.py` summary endpoint. Frontend: `DashboardPage` (last session,
    weekly activity, bodyweight trend, today's planned meals — **no** nutrition-streak card until
    meal logging exists) as the post-login home; `SettingsPage` to edit the profile.
    → **Verify:** dashboard numbers match the underlying pages; profile edits persist.

**Slice 5 — Deployment + README polish**
11. Prod build: FastAPI serves the built frontend (single origin), SQLite file on a volume,
    Caddy for HTTPS on a small VPS; prod redirect URI registered in the Google console; `Secure`
    session cookie; `FRONTEND_URL` set for prod. README: setup/run for both halves, Google OAuth
    client setup, deployment steps.
    → **Verify:** full flow works from a phone over the public URL.

## Verification

Each slice is verified as it lands (see the → Verify notes above). Full end-to-end pass at the end:

- **Setup:** create a Google OAuth 2.0 client (redirect URIs `http://localhost:8000/api/auth/callback`
  + the prod one), copy `.env.example` → `.env`, fill client id/secret + a session secret + FRONTEND_URL.
- **Backend:** `cd backend && pip install -r requirements.txt && alembic upgrade head &&
  python -m app.seed` then `uvicorn app.main:app --reload`. Complete Google sign-in and confirm the
  callback creates a `User` + session cookie. Via Swagger (authenticated): complete onboarding
  (confirm it creates the first bodyweight entry); create a routine, start a day from it, log sets,
  finish it, confirm prefill/history/PRs/duration/volume; list recipes w/ macros + tags; set a
  per-day weekly meal plan, confirm the shopping list scales servings, groups by department,
  check-off + Clear All persist, and daily macro totals are correct; fetch the dashboard summary.
- **Frontend:** `cd frontend && npm install && npm run dev`. Sign in → onboarding → dashboard.
  Build a routine, log a training day (prefill shows last values), log bodyweight; browse recipes
  with tags/photos; plan a week day-by-day and verify the aggregated department-grouped list,
  check-off, Clear All, print view, and macro totals; edit the profile in Settings. Verify the
  layout at phone width uses the bottom tab bar and every page is usable one-handed. Log out and
  confirm the app is gated behind login again.
- **Isolation check:** sign in as a second Google account and confirm none of the first user's
  routines / workouts / meal plan are visible.
- **Persistence check:** restart the backend and confirm profile, routines, logged sets, bodyweight,
  meal plan, and check-off state survive (SQLite file). Run a no-op `alembic upgrade head` to
  confirm migrations are wired.
- **Deployment check:** open the prod URL from a phone, sign in, log a set and check off a shopping
  item over mobile data.

## Out of scope (future iterations)

- **Discount-aware weekly compile** — when building the week's meal plan + shopping list, pull the
  current supermarket discounts (Aktionen) and score the *existing* recipes by how many of their
  ingredients are discounted, then recommend the best-value recipe set and annotate the shopping
  list with prices/savings. The schema prep is already done (canonical `IngredientItem` catalog +
  the sketched `StoreOffer` table); the open problem is the **data source** — German/Austrian
  supermarket offers have no clean public API, so this will be a scraper or a service like
  Marktguru, kept isolated behind a single adapter that writes `StoreOffer` rows per week.
- **Auto-generated cheap recipes** from price data — the further-out variant of the above
  (generate *new* recipes, not just rank existing ones).
- **Additional identity providers** beyond Google (flow is written generically to allow more).
- **MyFitnessPal API integration** (TODO) — pull the user's daily food logging from MyFitnessPal
  to complement recipes/nutrition tracking; would also unlock the design's "nutrition consistency"
  dashboard card.
- **Weekly recipe recommendations** (TODO) — each week suggest 4 different recipes per meal type
  (breakfast/lunch/dinner), tailored to the user's **diet goal** (e.g. cut/bulk) and their
  **training plan**. Builds on the UserProfile/diet-goal + workout data already in the model.
