from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import User, UserProfile
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

    oidc_sub = f"google:{userinfo['sub']}"
    user = db.scalar(select(User).where(User.oidc_sub == oidc_sub))
    if user is None:
        user = User(
            oidc_sub=oidc_sub,
            email=userinfo.get("email", ""),
            display_name=userinfo.get("name", ""),
        )
        db.add(user)
    else:
        user.email = userinfo.get("email", user.email)
        user.display_name = userinfo.get("name", user.display_name)
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
