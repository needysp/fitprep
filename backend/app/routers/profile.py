from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import BodyweightEntry, User, UserProfile
from ..schemas import (
    BodyweightCreate,
    BodyweightOut,
    ProfileCreate,
    ProfileOut,
    ProfileUpdate,
)

router = APIRouter(prefix="/api/profile", tags=["profile"])
bodyweight_router = APIRouter(prefix="/api/bodyweight", tags=["bodyweight"])


def _get_profile(db: Session, user: User) -> UserProfile | None:
    return db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))


@router.post("", response_model=ProfileOut, status_code=201)
def complete_onboarding(
    data: ProfileCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _get_profile(db, user) is not None:
        raise HTTPException(status_code=409, detail="Onboarding already completed")

    profile = UserProfile(user_id=user.id, **data.model_dump(exclude={"weight_kg"}))
    db.add(profile)
    # The profile stores no weight; the starting weight becomes the first log entry.
    db.add(BodyweightEntry(user_id=user.id, date=date.today(), weight_kg=data.weight_kg))
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=ProfileOut)
def read_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _get_profile(db, user)
    if profile is None:
        raise HTTPException(status_code=404, detail="Onboarding not completed")
    return profile


@router.put("", response_model=ProfileOut)
def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_profile(db, user)
    if profile is None:
        raise HTTPException(status_code=404, detail="Onboarding not completed")
    for field, value in data.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@bodyweight_router.get("", response_model=list[BodyweightOut])
def list_bodyweight(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return db.scalars(
        select(BodyweightEntry)
        .where(BodyweightEntry.user_id == user.id)
        .order_by(BodyweightEntry.date.asc())
    ).all()


@bodyweight_router.post("", response_model=BodyweightOut, status_code=201)
def log_bodyweight(
    data: BodyweightCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry_date = data.date or date.today()
    existing = db.scalar(
        select(BodyweightEntry).where(
            BodyweightEntry.user_id == user.id, BodyweightEntry.date == entry_date
        )
    )
    # One entry per day: logging again just corrects that day's value.
    if existing is not None:
        existing.weight_kg = data.weight_kg
        db.commit()
        db.refresh(existing)
        return existing

    entry = BodyweightEntry(user_id=user.id, date=entry_date, weight_kg=data.weight_kg)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@bodyweight_router.delete("/{entry_id}", status_code=204)
def delete_bodyweight(
    entry_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    entry = db.scalar(
        select(BodyweightEntry).where(
            BodyweightEntry.id == entry_id, BodyweightEntry.user_id == user.id
        )
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
