from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..models import AllowedEmail, User
from ..schemas import AllowedEmailCreate, AllowedEmailOut, UserAdminOut

# Every route here requires an admin session.
router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/allowlist", response_model=list[AllowedEmailOut])
def list_allowlist(db: Session = Depends(get_db)):
    entries = db.scalars(select(AllowedEmail).order_by(AllowedEmail.email)).all()
    registered = set(db.scalars(select(User.email)).all())
    return [
        AllowedEmailOut(
            id=e.id,
            email=e.email,
            role=e.role,
            note=e.note,
            created_at=e.created_at,
            registered=e.email in registered,
        )
        for e in entries
    ]


@router.post("/allowlist", response_model=AllowedEmailOut, status_code=201)
def add_allowed_email(data: AllowedEmailCreate, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(AllowedEmail).where(AllowedEmail.email == email)):
        raise HTTPException(status_code=409, detail="Email is already on the allowlist")
    entry = AllowedEmail(email=email, role=data.role, note=data.note)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return AllowedEmailOut(
        id=entry.id,
        email=entry.email,
        role=entry.role,
        note=entry.note,
        created_at=entry.created_at,
        registered=False,
    )


@router.delete("/allowlist/{entry_id}", status_code=204)
def remove_allowed_email(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(AllowedEmail, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()


@router.get("/users", response_model=list[UserAdminOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.created_at)).all()
