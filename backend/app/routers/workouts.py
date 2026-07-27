"""Workout logging: sessions -> exercise logs -> sets.

Everything the UI shows beyond the raw rows is derived here rather than stored:
session duration (timestamps), volume (sum of weight x reps), personal records
and prefill (queried from set history).
"""

from datetime import date as date_type
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    Exercise,
    ExerciseLog,
    Routine,
    RoutineExercise,
    User,
    WorkoutSession,
    WorkoutSet,
)
from ..schemas import (
    ExerciseHistoryOut,
    ExerciseHistoryPoint,
    ExerciseLogIn,
    ExerciseLogOut,
    ExerciseLogUpdate,
    PersonalRecord,
    PrefillOut,
    PrefillSetOut,
    SessionCreate,
    SessionDetailOut,
    SessionSummaryOut,
    SessionUpdate,
    SetIn,
    SetOut,
)
from .exercises import to_out, visible_exercise_or_404

router = APIRouter(tags=["workouts"])

_SESSION_LOADERS = (
    selectinload(WorkoutSession.logs).selectinload(ExerciseLog.sets),
    selectinload(WorkoutSession.logs).selectinload(ExerciseLog.exercise),
)


def estimated_1rm(weight_kg: float, reps: int) -> float:
    """Epley formula — comparable across different rep counts."""
    return round(weight_kg * (1 + reps / 30), 1)


def session_summary_fields(session: WorkoutSession) -> dict:
    sets = [s for log in session.logs for s in log.sets]
    duration = None
    if session.started_at and session.finished_at:
        duration = max(0, int((session.finished_at - session.started_at).total_seconds() // 60))
    return {
        "id": session.id,
        "date": session.date,
        "notes": session.notes,
        "routine_id": session.routine_id,
        "routine_name": session.routine.name if session.routine else None,
        "started_at": session.started_at,
        "finished_at": session.finished_at,
        "duration_minutes": duration,
        "total_volume_kg": round(sum(s.weight_kg * s.reps for s in sets), 1),
        "total_sets": len(sets),
    }


def _detail(session: WorkoutSession, user: User) -> SessionDetailOut:
    return SessionDetailOut(
        **session_summary_fields(session),
        logs=[
            ExerciseLogOut(
                id=log.id,
                exercise_id=log.exercise_id,
                notes=log.notes,
                exercise=to_out(log.exercise, user),
                sets=[SetOut.model_validate(s) for s in log.sets],
            )
            for log in session.logs
        ],
    )


def _own_session_or_404(session_id: int, user: User, db: Session) -> WorkoutSession:
    session = db.scalar(
        select(WorkoutSession)
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == user.id)
        .options(*_SESSION_LOADERS)
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _own_log_or_404(log_id: int, user: User, db: Session) -> ExerciseLog:
    log = db.scalar(
        select(ExerciseLog)
        .join(WorkoutSession)
        .where(ExerciseLog.id == log_id, WorkoutSession.user_id == user.id)
        .options(selectinload(ExerciseLog.sets))
    )
    if log is None:
        raise HTTPException(status_code=404, detail="Exercise log not found")
    return log


# --- Sessions ---


@router.post("/api/sessions", response_model=SessionDetailOut, status_code=201)
def start_session(
    data: SessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = WorkoutSession(
        user_id=user.id,
        date=data.date or date_type.today(),
        notes=data.notes,
        started_at=datetime.now(),
    )

    if data.from_routine_id is not None:
        routine = db.scalar(
            select(Routine)
            .where(Routine.id == data.from_routine_id, Routine.user_id == user.id)
            .options(selectinload(Routine.exercises))
        )
        if routine is None:
            raise HTTPException(status_code=404, detail="Routine not found")
        session.routine_id = routine.id
        # Pre-fill the day with the routine's planned exercises, in order.
        for routine_exercise in sorted(routine.exercises, key=lambda r: r.position):
            session.logs.append(ExerciseLog(exercise_id=routine_exercise.exercise_id))

    db.add(session)
    db.commit()
    return _detail(_own_session_or_404(session.id, user, db), user)


@router.get("/api/sessions", response_model=list[SessionSummaryOut])
def list_sessions(
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.scalars(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .limit(min(limit, 200))
        .options(*_SESSION_LOADERS, selectinload(WorkoutSession.routine))
    ).all()
    return [SessionSummaryOut(**session_summary_fields(s)) for s in sessions]


@router.get("/api/sessions/active", response_model=SessionDetailOut | None)
def active_session(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The most recent unfinished session, so the UI can offer to resume it."""
    session = db.scalar(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id, WorkoutSession.finished_at.is_(None))
        .order_by(WorkoutSession.id.desc())
        .options(*_SESSION_LOADERS, selectinload(WorkoutSession.routine))
    )
    return _detail(session, user) if session else None


@router.get("/api/sessions/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return _detail(_own_session_or_404(session_id, user, db), user)


@router.put("/api/sessions/{session_id}", response_model=SessionDetailOut)
def update_session(
    session_id: int,
    data: SessionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _own_session_or_404(session_id, user, db)
    session.notes = data.notes
    db.commit()
    return _detail(_own_session_or_404(session_id, user, db), user)


@router.put("/api/sessions/{session_id}/finish", response_model=SessionDetailOut)
def finish_session(
    session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    session = _own_session_or_404(session_id, user, db)
    if session.finished_at is None:
        session.finished_at = datetime.now()
        db.commit()
    return _detail(_own_session_or_404(session_id, user, db), user)


@router.delete("/api/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.delete(_own_session_or_404(session_id, user, db))
    db.commit()


# --- Exercise logs within a session ---


@router.post("/api/sessions/{session_id}/logs", response_model=ExerciseLogOut, status_code=201)
def add_log(
    session_id: int,
    data: ExerciseLogIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _own_session_or_404(session_id, user, db)
    exercise = visible_exercise_or_404(data.exercise_id, user, db)
    log = ExerciseLog(
        session_id=session.id, exercise_id=exercise.id, notes=data.notes
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return ExerciseLogOut(
        id=log.id,
        exercise_id=log.exercise_id,
        notes=log.notes,
        exercise=to_out(exercise, user),
        sets=[],
    )


@router.put("/api/logs/{log_id}", response_model=ExerciseLogOut)
def update_log(
    log_id: int,
    data: ExerciseLogUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = _own_log_or_404(log_id, user, db)
    log.notes = data.notes
    db.commit()
    db.refresh(log)
    return ExerciseLogOut(
        id=log.id,
        exercise_id=log.exercise_id,
        notes=log.notes,
        exercise=to_out(db.get(Exercise, log.exercise_id), user),
        sets=[SetOut.model_validate(s) for s in log.sets],
    )


@router.delete("/api/logs/{log_id}", status_code=204)
def delete_log(
    log_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.delete(_own_log_or_404(log_id, user, db))
    db.commit()


# --- Sets ---


@router.post("/api/logs/{log_id}/sets", response_model=SetOut, status_code=201)
def add_set(
    log_id: int,
    data: SetIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = _own_log_or_404(log_id, user, db)
    next_number = max((s.set_number for s in log.sets), default=0) + 1
    workout_set = WorkoutSet(
        exercise_log_id=log.id,
        set_number=next_number,
        weight_kg=data.weight_kg,
        reps=data.reps,
    )
    db.add(workout_set)
    db.commit()
    db.refresh(workout_set)
    return SetOut.model_validate(workout_set)


@router.put("/api/sets/{set_id}", response_model=SetOut)
def update_set(
    set_id: int,
    data: SetIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout_set = db.scalar(
        select(WorkoutSet)
        .join(ExerciseLog)
        .join(WorkoutSession)
        .where(WorkoutSet.id == set_id, WorkoutSession.user_id == user.id)
    )
    if workout_set is None:
        raise HTTPException(status_code=404, detail="Set not found")
    workout_set.weight_kg = data.weight_kg
    workout_set.reps = data.reps
    db.commit()
    db.refresh(workout_set)
    return SetOut.model_validate(workout_set)


@router.delete("/api/sets/{set_id}", status_code=204)
def delete_set(
    set_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    workout_set = db.scalar(
        select(WorkoutSet)
        .join(ExerciseLog)
        .join(WorkoutSession)
        .where(WorkoutSet.id == set_id, WorkoutSession.user_id == user.id)
    )
    if workout_set is None:
        raise HTTPException(status_code=404, detail="Set not found")
    db.delete(workout_set)
    db.commit()


# --- Derived: prefill + history/PRs ---


@router.get("/api/exercises/{exercise_id}/prefill", response_model=PrefillOut)
def prefill(
    exercise_id: int,
    session_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Values from the last time this exercise was trained.

    session_id (the session being logged right now) is excluded so today's own
    entries never prefill themselves.
    """
    exercise = visible_exercise_or_404(exercise_id, user, db)
    stmt = (
        select(ExerciseLog)
        .join(WorkoutSession)
        .where(
            ExerciseLog.exercise_id == exercise.id,
            WorkoutSession.user_id == user.id,
        )
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .options(selectinload(ExerciseLog.sets), selectinload(ExerciseLog.session))
    )
    if session_id is not None:
        stmt = stmt.where(ExerciseLog.session_id != session_id)

    for log in db.scalars(stmt).all():
        if log.sets:  # skip planned-but-never-logged entries
            return PrefillOut(
                exercise_id=exercise.id,
                last_session_date=log.session.date,
                notes=log.notes,
                sets=[
                    PrefillSetOut(
                        set_number=s.set_number, weight_kg=s.weight_kg, reps=s.reps
                    )
                    for s in log.sets
                ],
            )
    return PrefillOut(exercise_id=exercise.id, last_session_date=None)


@router.get("/api/exercises/{exercise_id}/history", response_model=ExerciseHistoryOut)
def exercise_history(
    exercise_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exercise = visible_exercise_or_404(exercise_id, user, db)
    logs = db.scalars(
        select(ExerciseLog)
        .join(WorkoutSession)
        .where(
            ExerciseLog.exercise_id == exercise.id,
            WorkoutSession.user_id == user.id,
        )
        .order_by(WorkoutSession.date.asc(), WorkoutSession.id.asc())
        .options(selectinload(ExerciseLog.sets), selectinload(ExerciseLog.session))
    ).all()

    points: list[ExerciseHistoryPoint] = []
    best_weight: PersonalRecord | None = None
    best_1rm: PersonalRecord | None = None

    for log in logs:
        if not log.sets:
            continue
        session_date = log.session.date
        heaviest = max(log.sets, key=lambda s: (s.weight_kg, s.reps))
        points.append(
            ExerciseHistoryPoint(
                date=session_date,
                session_id=log.session_id,
                best_weight_kg=heaviest.weight_kg,
                best_reps=heaviest.reps,
                total_volume_kg=round(sum(s.weight_kg * s.reps for s in log.sets), 1),
                sets=[SetOut.model_validate(s) for s in log.sets],
                notes=log.notes,
            )
        )
        for s in log.sets:
            if best_weight is None or (s.weight_kg, s.reps) > (
                best_weight.weight_kg,
                best_weight.reps,
            ):
                best_weight = PersonalRecord(
                    weight_kg=s.weight_kg,
                    reps=s.reps,
                    date=session_date,
                    estimated_1rm=estimated_1rm(s.weight_kg, s.reps),
                )
            one_rm = estimated_1rm(s.weight_kg, s.reps)
            if best_1rm is None or one_rm > best_1rm.estimated_1rm:
                best_1rm = PersonalRecord(
                    weight_kg=s.weight_kg,
                    reps=s.reps,
                    date=session_date,
                    estimated_1rm=one_rm,
                )

    return ExerciseHistoryOut(
        exercise=to_out(exercise, user),
        best_weight=best_weight,
        best_estimated_1rm=best_1rm,
        points=points,
    )
