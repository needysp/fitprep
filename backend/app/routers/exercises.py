"""Exercise catalog.

Visibility: every user sees the global catalog (created_by_user_id IS NULL) plus
their own private exercises. Admins curate the global catalog; regular users can
create private exercises so they are never blocked by a missing entry at the gym.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, ExerciseLog, RoutineExercise, User, UserRole
from ..schemas import ExerciseCreate, ExerciseOut, ExerciseUpdate

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


def to_out(exercise: Exercise, user: User) -> ExerciseOut:
    is_global = exercise.created_by_user_id is None
    return ExerciseOut(
        id=exercise.id,
        name=exercise.name,
        muscle_group=exercise.muscle_group,
        guide_url=exercise.guide_url,
        target_muscles=exercise.target_muscles,
        target_muscles_image_url=exercise.target_muscles_image_url,
        execution=exercise.execution,
        execution_image_url=exercise.execution_image_url,
        created_by_user_id=exercise.created_by_user_id,
        is_global=is_global,
        # Own exercises are always editable; global ones only by admins.
        can_edit=(not is_global and exercise.created_by_user_id == user.id)
        or (is_global and user.role == UserRole.admin),
    )


def visible_exercise_or_404(exercise_id: int, user: User, db: Session) -> Exercise:
    exercise = db.get(Exercise, exercise_id)
    if exercise is None or (
        exercise.created_by_user_id is not None and exercise.created_by_user_id != user.id
    ):
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


def _assert_name_free(
    db: Session, name: str, owner_id: int | None, exclude_id: int | None = None
) -> None:
    """Names must be unique within a scope (global, or one user's own)."""
    stmt = select(Exercise).where(
        func.lower(Exercise.name) == name.lower(),
        Exercise.created_by_user_id.is_(None)
        if owner_id is None
        else Exercise.created_by_user_id == owner_id,
    )
    if exclude_id is not None:
        stmt = stmt.where(Exercise.id != exclude_id)
    if db.scalar(stmt) is not None:
        scope = "the global catalog" if owner_id is None else "your exercises"
        raise HTTPException(status_code=409, detail=f"'{name}' already exists in {scope}")


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    search: str | None = Query(default=None),
    muscle_group: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Exercise).where(
        or_(
            Exercise.created_by_user_id.is_(None),
            Exercise.created_by_user_id == user.id,
        )
    )
    if search:
        stmt = stmt.where(Exercise.name.ilike(f"%{search}%"))
    if muscle_group:
        stmt = stmt.where(Exercise.muscle_group == muscle_group)
    exercises = db.scalars(stmt.order_by(Exercise.muscle_group, Exercise.name)).all()
    return [to_out(e, user) for e in exercises]


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(
    data: ExerciseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.is_global and user.role != UserRole.admin:
        raise HTTPException(
            status_code=403, detail="Only admins can add to the global catalog"
        )
    owner_id = None if data.is_global else user.id
    name = data.name.strip()
    _assert_name_free(db, name, owner_id)

    exercise = Exercise(
        name=name,
        # Lowercased so case variants can't split one group into two sections.
        muscle_group=data.muscle_group.strip().lower(),
        guide_url=data.guide_url.strip(),
        target_muscles=data.target_muscles.strip(),
        target_muscles_image_url=data.target_muscles_image_url.strip(),
        execution=data.execution.strip(),
        execution_image_url=data.execution_image_url.strip(),
        created_by_user_id=owner_id,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return to_out(exercise, user)


@router.put("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(
    exercise_id: int,
    data: ExerciseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exercise = visible_exercise_or_404(exercise_id, user, db)
    if not to_out(exercise, user).can_edit:
        raise HTTPException(
            status_code=403, detail="Only admins can edit the global catalog"
        )
    name = data.name.strip()
    _assert_name_free(db, name, exercise.created_by_user_id, exclude_id=exercise.id)

    exercise.name = name
    exercise.muscle_group = data.muscle_group.strip().lower()
    exercise.guide_url = data.guide_url.strip()
    exercise.target_muscles = data.target_muscles.strip()
    exercise.target_muscles_image_url = data.target_muscles_image_url.strip()
    exercise.execution = data.execution.strip()
    exercise.execution_image_url = data.execution_image_url.strip()
    db.commit()
    db.refresh(exercise)
    return to_out(exercise, user)


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(
    exercise_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exercise = visible_exercise_or_404(exercise_id, user, db)
    if not to_out(exercise, user).can_edit:
        raise HTTPException(
            status_code=403, detail="Only admins can delete from the global catalog"
        )

    # Deleting would cascade away logged sets, so refuse while it is in use —
    # training history must never disappear as a side effect.
    if db.scalar(select(ExerciseLog).where(ExerciseLog.exercise_id == exercise_id)):
        raise HTTPException(
            status_code=409,
            detail="This exercise has logged workouts and cannot be deleted",
        )
    if db.scalar(select(RoutineExercise).where(RoutineExercise.exercise_id == exercise_id)):
        raise HTTPException(
            status_code=409,
            detail="This exercise is used in a routine — remove it there first",
        )

    db.delete(exercise)
    db.commit()
