"""Home screen summary.

Everything here is derived from data the app already has — no new tables, and
deliberately nothing that would need meal *logging* (which doesn't exist yet).
"""

from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import BodyweightEntry, ExerciseLog, MealPlanItem, User, WorkoutSession
from ..schemas import (
    BodyweightOut,
    DashboardBodyweight,
    DashboardDay,
    DashboardOut,
    DashboardSession,
    DashboardToday,
    DashboardWeek,
    MealPlanItemOut,
)
from .workouts import session_summary_fields

router = APIRouter(tags=["dashboard"])

BODYWEIGHT_POINTS = 14


@router.get("/api/dashboard", response_model=DashboardOut)
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date_type.today()
    week_start = today - timedelta(days=today.weekday())

    loaders = (
        selectinload(WorkoutSession.logs).selectinload(ExerciseLog.sets),
        selectinload(WorkoutSession.routine),
    )

    active = db.scalar(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id, WorkoutSession.finished_at.is_(None))
        .order_by(WorkoutSession.id.desc())
    )

    last = db.scalar(
        select(WorkoutSession)
        .where(
            WorkoutSession.user_id == user.id, WorkoutSession.finished_at.is_not(None)
        )
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .options(*loaders)
    )
    last_session = None
    if last is not None:
        fields = session_summary_fields(last)
        last_session = DashboardSession(
            id=fields["id"],
            date=fields["date"],
            routine_name=fields["routine_name"],
            duration_minutes=fields["duration_minutes"],
            total_volume_kg=fields["total_volume_kg"],
            total_sets=fields["total_sets"],
        )

    # This week's training
    week_sessions = db.scalars(
        select(WorkoutSession)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.date >= week_start,
            WorkoutSession.date < week_start + timedelta(days=7),
        )
        .options(*loaders)
    ).all()

    per_day = [
        DashboardDay(day_of_week=day, workouts=0, minutes=0, volume_kg=0.0)
        for day in range(7)
    ]
    for session in week_sessions:
        fields = session_summary_fields(session)
        day = per_day[session.date.weekday()]
        day.workouts += 1
        day.minutes += fields["duration_minutes"] or 0
        day.volume_kg += fields["total_volume_kg"]
    for day in per_day:
        day.volume_kg = round(day.volume_kg, 1)

    week = DashboardWeek(
        week_start=week_start,
        workouts=len(week_sessions),
        total_minutes=sum(d.minutes for d in per_day),
        total_volume_kg=round(sum(d.volume_kg for d in per_day), 1),
        per_day=per_day,
    )

    # Bodyweight trend — the most recent points, oldest first for plotting.
    recent = list(
        db.scalars(
            select(BodyweightEntry)
            .where(BodyweightEntry.user_id == user.id)
            .order_by(BodyweightEntry.date.desc())
            .limit(BODYWEIGHT_POINTS)
        )
    )[::-1]
    bodyweight = DashboardBodyweight(
        current=recent[-1].weight_kg if recent else None,
        change_kg=round(recent[-1].weight_kg - recent[0].weight_kg, 1)
        if len(recent) > 1
        else None,
        entries=[BodyweightOut.model_validate(e) for e in recent],
    )

    # Today's planned meals, straight from this week's plan
    todays_meals = db.scalars(
        select(MealPlanItem)
        .where(
            MealPlanItem.user_id == user.id,
            MealPlanItem.week_start == week_start,
            MealPlanItem.day_of_week == today.weekday(),
        )
        .order_by(MealPlanItem.id)
        .options(selectinload(MealPlanItem.recipe))
    ).all()

    today_out = DashboardToday(
        date=today,
        day_of_week=today.weekday(),
        meals=[
            MealPlanItemOut(
                id=item.id,
                day_of_week=item.day_of_week,
                meal_type=item.meal_type,
                recipe_id=item.recipe_id,
                recipe_title=item.recipe.title,
                servings=item.recipe.servings,
                calories=item.recipe.calories,
                protein_g=item.recipe.protein_g,
                carbs_g=item.recipe.carbs_g,
                fat_g=item.recipe.fat_g,
            )
            for item in todays_meals
        ],
        calories=round(sum(i.recipe.calories for i in todays_meals), 1),
        protein_g=round(sum(i.recipe.protein_g for i in todays_meals), 1),
        carbs_g=round(sum(i.recipe.carbs_g for i in todays_meals), 1),
        fat_g=round(sum(i.recipe.fat_g for i in todays_meals), 1),
    )

    return DashboardOut(
        active_session_id=active.id if active else None,
        last_session=last_session,
        week=week,
        bodyweight=bodyweight,
        today=today_out,
    )
