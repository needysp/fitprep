from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import AllowedEmail, User, UserProfile, UserRole
from .schemas import MeOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

settings = get_settings()

# Registered generically so further IdPs can be added the same way later.
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.get(User, user_id)
    if user is None:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _resolve_role(db: Session, email: str, email_verified: bool) -> UserRole | None:
    """Role to grant this email, or None if it may not sign in.

    Config ADMIN_EMAILS are always allowed as admins (bootstrap); otherwise the
    email must be on the admin-managed allowlist, which also carries its role.
    An unverified IdP email is never accepted (it must not match an allowed one).
    """
    if not email or not email_verified:
        return None
    if email in settings.admin_email_set:
        return UserRole.admin
    allowed = db.scalar(select(AllowedEmail).where(AllowedEmail.email == email))
    return allowed.role if allowed is not None else None


@router.get("/login")
async def login(request: Request):
    redirect_uri = str(request.url_for("auth_callback"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback", name="auth_callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as exc:
        raise HTTPException(status_code=401, detail=f"Sign-in failed: {exc.error}")
    userinfo = token.get("userinfo")
    if not userinfo or "sub" not in userinfo:
        raise HTTPException(status_code=401, detail="Sign-in failed: no identity returned")

    email = (userinfo.get("email") or "").lower()
    role = _resolve_role(db, email, bool(userinfo.get("email_verified")))
    if role is None:
        # Not on the allowlist: create no account, set no session.
        request.session.clear()
        return RedirectResponse(f"{settings.frontend_url}/login?error=not_allowed")

    oidc_sub = f"google:{userinfo['sub']}"
    user = db.scalar(select(User).where(User.oidc_sub == oidc_sub))
    if user is None:
        user = User(oidc_sub=oidc_sub, email=email, display_name=userinfo.get("name", ""))
        db.add(user)
    else:
        user.email = email
        user.display_name = userinfo.get("name", user.display_name)
    user.role = role  # re-sync from the allowlist on every login
    db.commit()
    db.refresh(user)

    request.session["user_id"] = user.id
    return RedirectResponse(settings.frontend_url)


@router.post("/logout", status_code=204)
async def logout(request: Request):
    request.session.clear()


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    return MeOut(user=user, profile=profile)
