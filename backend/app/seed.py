"""Seed the global catalogs. Idempotent — safe to re-run.

Run with:  python -m app.seed
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Exercise

# Global starter exercises (created_by_user_id stays NULL). guide_url is left
# empty on purpose: fitundattraktiv.de uses article-style slugs that can't be
# derived from an exercise name, so links are filled in per exercise from the
# UI rather than guessed here (a wrong link is worse than none).
STARTER_EXERCISES: list[tuple[str, str]] = [
    # Chest
    ("Bench Press", "chest"),
    ("Incline Dumbbell Press", "chest"),
    ("Cable Fly", "chest"),
    ("Push-Up", "chest"),
    # Back
    ("Deadlift", "back"),
    ("Pull-Up", "back"),
    ("Barbell Row", "back"),
    ("Lat Pulldown", "back"),
    ("Seated Cable Row", "back"),
    # Legs
    ("Squat", "legs"),
    ("Leg Press", "legs"),
    ("Romanian Deadlift", "legs"),
    ("Leg Curl", "legs"),
    ("Leg Extension", "legs"),
    ("Calf Raise", "legs"),
    # Shoulders
    ("Overhead Press", "shoulders"),
    ("Lateral Raise", "shoulders"),
    ("Face Pull", "shoulders"),
    # Arms
    ("Barbell Curl", "arms"),
    ("Dumbbell Curl", "arms"),
    ("Triceps Pushdown", "arms"),
    ("Skull Crusher", "arms"),
    # Core
    ("Plank", "core"),
    ("Hanging Leg Raise", "core"),
    ("Cable Crunch", "core"),
]


def seed_exercises(db: Session) -> int:
    existing = {
        name
        for name in db.scalars(
            select(Exercise.name).where(Exercise.created_by_user_id.is_(None))
        )
    }
    added = 0
    for name, muscle_group in STARTER_EXERCISES:
        if name in existing:
            continue
        db.add(Exercise(name=name, muscle_group=muscle_group, guide_url=""))
        added += 1
    db.commit()
    return added


def main() -> None:
    db = SessionLocal()
    try:
        added = seed_exercises(db)
        total = len(
            db.scalars(select(Exercise).where(Exercise.created_by_user_id.is_(None))).all()
        )
        print(f"Seeded {added} new global exercise(s); {total} in the global catalog.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
