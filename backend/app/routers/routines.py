"""Training-plan templates (user-scoped)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import Routine, RoutineExercise, User
from ..schemas import RoutineIn, RoutineOut
from .exercises import to_out, visible_exercise_or_404

router = APIRouter(prefix="/api/routines", tags=["routines"])


def _load(routine: Routine, user: User) -> RoutineOut:
    return RoutineOut(
        id=routine.id,
        name=routine.name,
        description=routine.description,
        exercises=[
            {
                "id": re.id,
                "exercise_id": re.exercise_id,
                "position": re.position,
                "target_sets": re.target_sets,
                "target_reps": re.target_reps,
                "exercise": to_out(re.exercise, user),
            }
            for re in routine.exercises
        ],
    )


def _own_routine_or_404(routine_id: int, user: User, db: Session) -> Routine:
    routine = db.scalar(
        select(Routine)
        .where(Routine.id == routine_id, Routine.user_id == user.id)
        .options(selectinload(Routine.exercises).selectinload(RoutineExercise.exercise))
    )
    if routine is None:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine


def _replace_exercises(routine: Routine, data: RoutineIn, user: User, db: Session) -> None:
    routine.exercises.clear()
    db.flush()
    for position, item in enumerate(data.exercises):
        # Ensures the exercise exists and the user is allowed to see it.
        visible_exercise_or_404(item.exercise_id, user, db)
        routine.exercises.append(
            RoutineExercise(
                exercise_id=item.exercise_id,
                position=position,
                target_sets=item.target_sets,
                target_reps=item.target_reps,
            )
        )


@router.get("", response_model=list[RoutineOut])
def list_routines(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    routines = db.scalars(
        select(Routine)
        .where(Routine.user_id == user.id)
        .order_by(Routine.name)
        .options(selectinload(Routine.exercises).selectinload(RoutineExercise.exercise))
    ).all()
    return [_load(r, user) for r in routines]


@router.get("/{routine_id}", response_model=RoutineOut)
def get_routine(
    routine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return _load(_own_routine_or_404(routine_id, user, db), user)


@router.post("", response_model=RoutineOut, status_code=201)
def create_routine(
    data: RoutineIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    routine = Routine(user_id=user.id, name=data.name.strip(), description=data.description)
    db.add(routine)
    db.flush()
    _replace_exercises(routine, data, user, db)
    db.commit()
    return _load(_own_routine_or_404(routine.id, user, db), user)


@router.put("/{routine_id}", response_model=RoutineOut)
def update_routine(
    routine_id: int,
    data: RoutineIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    routine = _own_routine_or_404(routine_id, user, db)
    routine.name = data.name.strip()
    routine.description = data.description
    _replace_exercises(routine, data, user, db)
    db.commit()
    return _load(_own_routine_or_404(routine.id, user, db), user)


@router.delete("/{routine_id}", status_code=204)
def delete_routine(
    routine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Logged sessions keep their history; WorkoutSession.routine_id is SET NULL.
    db.delete(_own_routine_or_404(routine_id, user, db))
    db.commit()
