# Fitness & Mealprep Personal Website — Build Plan

## Context

The user recently started going to the gym and doing meal prep, and wants a simple
personal website to support both habits. This is a greenfield project, scaffolded from scratch.

Access is **invite-only**: the app is not open to anyone with a Google account. An **admin**
maintains an allowlist of permitted email addresses; only those emails (plus the config-defined
bootstrap admins) can sign in. There are two roles — **admin** and **user** — and the allowlist
entry decides which role a person gets.

In v1 an allowed user signs in via an identity provider (**Google OIDC** to start), completes a
one-time **onboarding** (height, training goal, diet goal, starting bodyweight), and then uses the
app — with all data stored **per authenticated user**:
1. **Training** — define a reusable **training plan / routine** (e.g. Push/Pull/Legs) with a planned
   exercise list, then log each workout day from it with basic input (sets, kg, reps). Each exercise
   links out to a guide page (e.g. fitundattraktiv.de) and can carry the user's **own how-to info**
   (target muscles + Haltung & Ausführung, each with an optional image), shown in an **overlay**
   while training. Notes are recorded **per training day per exercise**, so the app builds a
   training history (per-day notes, achievements/progress).
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
5. **Admin** (admins only) — manage the login allowlist (add/remove permitted emails, choose each
   one's role) and see who has registered. Hidden from regular users.

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
- **Access control:** invite-only via an admin-managed **allowlist** (`AllowedEmail`) keyed by email.
  Login is rejected unless the (verified) IdP email is on the allowlist or in the config
  **`ADMIN_EMAILS`** bootstrap list. Two roles, **admin** / **user**; the allowlist entry sets the
  role and it re-syncs on every login (allowlist is the source of truth). `ADMIN_EMAILS` solves the
  first-admin bootstrap and can never be locked out — those emails are always allowed as admins.
- **Scope:** auth + onboarding + all sections above, **multi-user from the start** (every record is user-scoped).
- **Exercise info:** each exercise stores a `guide_url` (e.g. fitundattraktiv.de) plus the user's
  **own how-to reference** — `target_muscles` and `execution` (Haltung & Ausführung), each with an
  optional image URL — surfaced in an **overlay on the training page** so form can be checked
  mid-workout without navigating away. The user fills these in themselves (writing their own notes
  or pasting in what they find useful); this is a private, invite-only app for personal reference,
  not a public reproduction of anyone's content. Image *URLs* are stored, not copies — a broken or
  hotlink-blocked image just hides itself.
  `guide_url` is neutral so any guide can be linked, and it is **not seeded with guessed URLs**
  (fitundattraktiv.de uses article-style slugs that can't be derived from an exercise name, so a
  wrong link is worse than none) — links are pasted in per exercise from the UI.
- **Who may create exercises (hybrid):** admins curate the **global catalog**; every user can create
  **private exercises** only they see (`Exercise.created_by_user_id` NULL = global, set = private).
  Rationale: admin-only would block a user at the gym when a machine is missing from the catalog,
  while letting everyone write to the global catalog would fill it with duplicates/typos — and since
  PRs and prefill key on `exercise_id`, duplicates would silently split a user's history.
  Deleting an exercise is **refused** while any workout log or routine references it, so training
  history can never disappear as a side effect.
- **Recipe macros are computed from the ingredients**, never accepted from the client: per-100 g
  nutrition lives on `IngredientItem` in the database, and `nutrition.py` derives each recipe's
  per-serving macros from its actual quantities. The seed and the recipe write endpoints share that
  one function, so a user-written recipe gets its numbers exactly the way a seeded one does. Keeps
  what the app shows consistent with what the recipe contains — and with the weekly macro totals
  derived from it in Slice 3.
- **Users can write their own recipes** (same ownership rule as exercises): `Recipe.created_by_user_id`
  NULL = shared catalog (seeded / admin-managed), set = private to that user. Admins can publish to
  the shared catalog. Any user can extend the shared **ingredient** catalog (case-insensitive dedup on
  name, so one ingredient can't split the shopping list into two lines); ingredients are shared rather
  than per-user because they are a common vocabulary, and this is a small invite-only group.
  A recipe cannot be deleted while a meal plan still references it.
- **No invented recipe photos:** `image_url` is seeded empty and cards render a tinted fallback,
  the same rule applied to exercise `guide_url`. Real photos can be added later.
- **Ingredients are a canonical catalog**, not free text: recipes reference `IngredientItem` rows
  (with a supermarket-department category). This makes shopping-list aggregation robust, enables the
  department grouping from the design, and is the join point for future discount/price data.
- **Meal plan is per-day:** each `MealPlanItem` is one recipe in one `day_of_week` + `meal_type`
  slot, so servings scaling and daily macro totals are well-defined. **Any slot can hold several
  recipes** — a breakfast is often muesli *and* a protein shake — and adding the same recipe twice
  simply counts as two servings, which the shopping quantities and macro totals both pick up.
- **Shopping quantities scale to servings actually planned:** a 4-serving recipe eaten four times
  buys one full batch of ingredients; eaten twice, half. This buys what will be eaten rather than
  rounding up to whole batches — cooking a smaller portion is easy, and over-buying is waste.
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
      auth.py           # OIDC (Google) login/callback/logout + allowlist gate + current-user/admin deps
      routers/
        profile.py      # onboarding + read/update profile; bodyweight log
        admin.py        # admin-only: manage login allowlist + list registered users
        exercises.py    # CRUD for exercise library
        routines.py     # training-plan templates (user-scoped)
        workouts.py     # log + query workout sessions/sets, prefill, history (user-scoped)
        recipes.py      # list/read recipes (macros, tags, image) by meal_type
        mealplan.py     # per-day weekly plan + derived shopping list + check-off + macro totals
        dashboard.py    # summary endpoint: last session, weekly activity, bodyweight trend, today's meals
      seed.py           # seed starter exercises + ingredient catalog + 16 recipes w/ macros (global)
    alembic/            # migrations (init in Slice 0, autogenerate per schema change)
    requirements.txt
    .env.example        # GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / SESSION_SECRET / FRONTEND_URL / ADMIN_EMAILS
  frontend/
    index.html
    package.json, vite.config.ts, tsconfig.json, tailwind.config.ts  # Aura tokens in the theme
    src/
      main.tsx, App.tsx        # router + auth guard + responsive nav (sidebar / bottom tab bar)
      auth/AuthContext.tsx     # holds current user, redirects to login when unauthenticated
      api/client.ts            # typed fetch wrapper (sends session cookie) to the backend
      pages/
        LoginPage.tsx          # "Sign in with Google" button + not-allowed error banner
        OnboardingPage.tsx     # first-login form: height, goals, starting bodyweight
        DashboardPage.tsx      # home: last session, weekly activity, bodyweight trend, today's meals
        AdminPage.tsx          # admin-only: manage allowlist (email + role) + view registered users
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
2. Google redirects back to `GET /api/auth/callback` → backend verifies the token, then checks the
   **allowlist**: the (verified) email must be in `ADMIN_EMAILS` (→ admin) or have an `AllowedEmail`
   row (→ that row's role). If not allowed, **no `User` is created and no session is set** — it
   redirects to `FRONTEND_URL/login?error=not_allowed` and the login page explains access is
   invite-only. If allowed, it upserts the `User` (by Google `sub`/email), sets the role, stores
   `user_id` in the session cookie, and redirects to **`FRONTEND_URL`** (config, not hardcoded —
   differs between dev `:5173` and prod).
3. Frontend calls `GET /api/auth/me` (returns the user incl. `role` + profile); if the user has
   **no profile yet** → route to `OnboardingPage`, otherwise → the app. Admin-only routes/nav are
   gated on `role === "admin"`. `POST /api/auth/logout` clears the session.

Access is checked at **login time** (the gate to getting a session). Removing someone from the
allowlist blocks their next login; an already-open session lasts until logout — acceptable for a
personal app with a handful of users. A `require_admin` dependency guards every admin endpoint.

The Google OAuth client needs **both** redirect URIs registered: the localhost one for dev and the
production domain one. In prod the session cookie is `Secure` (HTTPS via Caddy).

Every data endpoint depends on a `current_user` (from the session cookie) and filters/writes by
`user_id`, so users only ever see their own workouts, meal plans, and profile. The exercise,
ingredient, and recipe catalogs are global (seeded, shared by all users).

### Data model (SQLAlchemy, `models.py`)

- **User** — `id, oidc_sub, email, display_name, role` (enum admin/user), `created_at` — one row per
  Google account (upserted on login); `role` re-synced from the allowlist each login
- **AllowedEmail** — `id, email (unique), role` (enum admin/user), `note, created_at` — the
  admin-managed login allowlist; presence of a matching (verified) email is what permits sign-in,
  and the row's role is granted to the user. Config `ADMIN_EMAILS` are always-allowed admins on top
  of this table (no row required).
- **UserProfile** — `id, user_id (FK, unique), height_cm, gender, training_goal, diet_goal`
  (enum lean_bulk/bulk/cut/custom) `+ diet_custom_text` — created during onboarding; its presence is
  how the app knows onboarding is complete. **No weight field** — current weight is the latest
  `BodyweightEntry`; onboarding creates the first one.
- **Exercise** — `id, name, muscle_group, guide_url, target_muscles, target_muscles_image_url,
  execution, execution_image_url, created_by_user_id` — `created_by_user_id` NULL = shared global
  catalog (seeded / admin-managed), set = private to that user; the info fields are the user's own
  how-to reference shown in the training overlay (empty on seeded rows, filled in from the UI)
- **Routine** — `id, user_id (FK), name, description` — a reusable training-plan template
- **RoutineExercise** — `id, routine_id (FK), exercise_id (FK), position, target_sets, target_reps`
  — the planned exercise list for a routine
- **WorkoutSession** — `id, user_id (FK), routine_id (FK, nullable), date, notes,
  started_at, finished_at (nullable)` — one training day, optionally started from a routine (which
  pre-fills its exercises). **Duration** is derived from the timestamps; **total volume**
  (Σ weight×reps) is derived from the sets — neither is stored.
- **ExerciseLog** — `id, session_id (FK), exercise_id (FK), notes` — one exercise done on that
  day, with the **per-day notes** (a separate per-day "goal" field was tried and removed: it
  duplicated the notes in practice and added friction while logging)
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
day groups the exercises trained, each carries its own notes, and **achievements/progress**
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
- **Admin only** (`require_admin`): `GET/POST /api/admin/allowlist`, `DELETE /api/admin/allowlist/{id}`
  (manage permitted emails + roles), `GET /api/admin/users` (list registered users + roles)
- `POST /api/profile` (complete onboarding incl. starting bodyweight), `GET/PUT /api/profile`
- `GET/POST /api/bodyweight` (log + list bodyweight over time)
- `GET/POST/PUT/DELETE /api/exercises`
- `GET/POST/PUT/DELETE /api/routines` (training-plan templates + their exercise lists)
- `POST /api/sessions` (start a training day, optionally `from_routine_id`; sets `started_at`),
  `PUT /api/sessions/{id}/finish` (sets `finished_at`), `GET /api/sessions` (history list),
  `GET /api/sessions/{id}` (a day with its exercise logs, notes, sets, duration, volume)
- `POST /api/sessions/{id}/logs` (add an exercise log w/ notes), `POST /api/logs/{id}/sets` (log a set)
- `GET /api/exercises/{id}/history` (per-exercise progress + PRs), `GET /api/exercises/{id}/prefill` (last set values)
- `GET /api/recipes?meal_type=` (shared + own), `GET /api/recipes/{id}` (incl. macros, tags,
  ingredients), `POST/PUT/DELETE /api/recipes` (write your own; admins may publish to the shared
  catalog; macros always computed server-side)
- `GET/POST /api/ingredients` (shared ingredient catalog incl. per-100 g nutrition)
- `GET /api/mealplan?week_start=` (the week's per-day recipe grid + per-day macro totals),
  `POST /api/mealplan?week_start=` (add one meal to a slot),
  `DELETE /api/mealplan/{item_id}` (remove one meal) — single-item writes rather than the
  originally sketched whole-week `PUT`, so tapping a slot doesn't resend the entire week
- `GET /api/shopping-list?week_start=` (aggregated by department + check state),
  `PUT /api/shopping-list/check?week_start=` (toggle an item by `ingredient_item_id`),
  `POST /api/shopping-list/clear?week_start=` (Clear All — uncheck everything)
- `GET /api/dashboard` (in-progress session, last finished session, this week's workouts +
  minutes + volume + per-weekday activity, bodyweight trend, today's planned meals with macros)

All endpoints except `/api/auth/*` require an authenticated session and operate on the current user.

## Implementation steps

Built in **vertical slices** — each slice ships a fully usable backend+frontend piece and is verified
before the next starts.

**Slice 0 — Foundation (scaffold + auth + access control + onboarding)**
1. Backend scaffold: `requirements.txt` (fastapi, uvicorn, sqlalchemy, **alembic**, pydantic,
   pydantic-settings, authlib, itsdangerous, httpx, **email-validator**), `config.py` (incl.
   `FRONTEND_URL`, `ADMIN_EMAILS`), `database.py`, `models.py` (all models incl. `User.role` +
   `AllowedEmail`), `schemas.py`, `main.py` with `SessionMiddleware`, CORS, routers mounted.
   **Alembic init + initial migration** (schema changes are migrations from here on).
2. `auth.py`: Google OIDC via Authlib (`login`/`callback`/`logout`/`me`) + **allowlist gate** in the
   callback (reject non-allowed emails → `?error=not_allowed`, no account/session) + `current_user`
   and `require_admin` dependencies; `routers/profile.py` for onboarding (creates profile + first
   `BodyweightEntry`) + profile read/update; `routers/admin.py` (allowlist CRUD + users list).
   `.env.example` + README Google-OAuth steps (register both dev + prod redirect URIs; set
   `ADMIN_EMAILS` to your own email).
3. Frontend scaffold: Vite React+TS + Tailwind with the **Aura design tokens** (colors incl. primary
   `#d97757`, Inter, radii, spacing); responsive shell — **desktop sidebar + mobile bottom tab bar**,
   with the **Admin** nav shown only to admins; `api/client.ts` (credentials: include), `AuthContext`
   + auth guard + admin guard, Vite `/api` proxy; `LoginPage` (with not-allowed banner),
   `OnboardingPage`, `AdminPage`.
   → **Verify:** with your email in `ADMIN_EMAILS`, sign in with Google → admin; complete onboarding,
   land in the (empty) app; open Admin, add a friend's email, confirm a non-allowlisted account is
   rejected at login with the banner; shell renders correctly at phone width (bottom tab bar) and
   desktop (sidebar).

**Slice 1 — Training (end-to-end)**
4. Backend: `seed.py` starter exercises (25 global, `guide_url` blank); `routers/exercises.py`
   (global + own visibility, admin-vs-owner edit rules, delete guarded when referenced), `routines.py`,
   `workouts.py` (sessions/logs/sets, `from_routine_id`, start/finish timestamps, history+PRs,
   prefill, derived duration + volume); bodyweight endpoints.
5. Frontend: `RoutinesPage` (build a plan), `TrainingPage` (start a day from a routine, log sets with
   prefill via **+/− steppers**, finish the session, view history/PRs with duration + volume),
   `ExerciseInfoModal` (how-to overlay: target muscles + Haltung & Ausführung, editable in place),
   `BodyweightPage`.
   → **Verify:** create a routine, log a day, confirm prefill + history + duration/volume + bodyweight
   persist per user.

**Slice 2 — Recipes (end-to-end)**
6. Backend: seed the **ingredient catalog** (45 canonical items + department categories + per-100 g
   nutrition) and 16 recipes (4 per meal type) referencing it, with tags and **macros computed from
   the ingredient quantities**; `routers/recipes.py` (read-only list + detail).
7. Frontend: `RecipesPage` with meal-type tabs + search, cards showing photo (graceful without),
   tags and macros; `RecipeDetailPage` (ingredients grouped by department, method steps);
   `RecipeEditorPage` + `IngredientPicker` for writing your own recipes, with a live per-serving
   macro preview as ingredients are added.
   → **Verify:** browse 4 recipes per meal type with correct macros, tags render, cards without
   images degrade cleanly; write a recipe and confirm its macros are computed from the ingredients
   and it stays private to its author.

**Slice 3 — Meal plan + shopping list (end-to-end)**
8. Backend: `routers/mealplan.py` — per-day weekly plan (`week_start` = ISO Monday, validated),
   derived shopping list (servings-scaled, grouped by department), check-off state by ingredient ID,
   Clear All, daily macro totals.
9. Frontend: `ShoppingListPage` — week navigation with **Plan / Shopping list** tabs. The plan tab is
   a card per weekday with a slot per meal type (day × meal-type grid, stacked for phones) and
   per-day macro totals; the list tab is the aggregated list grouped by department with
   tap-to-check-off (optimistic, so it feels instant in a shop), **Clear All** and **Print**
   (print stylesheet strips the app chrome).
   → **Verify:** plan a week incl. one recipe eaten on several days, confirm quantities scale with
   servings, department grouping, check-off + Clear All persistence, print view, and per-day macro totals.

**Slice 4 — Dashboard + settings**
10. Backend: `routers/dashboard.py` summary endpoint — reuses `session_summary_fields` from
    `workouts.py` so the dashboard's duration/volume can't drift from the training pages.
    Frontend: `DashboardPage` (resume-in-progress banner, last session, weekly activity bars,
    bodyweight trend sparkline, today's planned meals — **no** nutrition-streak card until meal
    logging exists) as the post-login home; `SettingsPage` to edit the profile, reachable from the
    sidebar (desktop) and the top bar (mobile).
    → **Verify:** dashboard numbers match the underlying pages; profile edits persist.
    ✔ Done — the e2e cross-checks every dashboard number against the endpoint the corresponding
    page uses, and covers the empty state for a brand-new user.

**Slice 5 — Deployment + README polish**
11. Prod build: FastAPI serves the built frontend (single origin), SQLite file on a volume,
    Caddy for HTTPS on a small VPS; prod redirect URI registered in the Google console; `Secure`
    session cookie; `FRONTEND_URL` set for prod. README: setup/run for both halves, Google OAuth
    client setup, deployment steps.
    → **Verify:** full flow works from a phone over the public URL.

## Verification

Each slice is verified as it lands (see the → Verify notes above). Full end-to-end pass at the end:

- **Setup:** create a Google OAuth 2.0 client (redirect URIs `http://localhost:8000/api/auth/callback`
  + the prod one), copy `.env.example` → `.env`, fill client id/secret + a session secret +
  FRONTEND_URL + `ADMIN_EMAILS` (your own email, so the first sign-in is an admin).
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
- **Access-control check:** try signing in with a Google account that is **not** on the allowlist →
  rejected with the not-allowed banner, no account created. As an admin, add that email in Admin,
  confirm it can now sign in; remove it and confirm the next login is blocked. Confirm a regular
  user sees no Admin nav and `GET /api/admin/*` returns 403 for them.
- **Isolation check:** sign in as a second (allowlisted) Google account and confirm none of the
  first user's routines / workouts / meal plan are visible.
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
