from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import BodyweightEntry, User, UserProfile
from ..schemas import ProfileCreate, ProfileOut, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


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
