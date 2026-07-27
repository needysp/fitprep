from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from .models import DietGoal, UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    role: UserRole


class ProfileBase(BaseModel):
    height_cm: float = Field(gt=50, lt=300)
    gender: str = Field(default="", max_length=32)
    training_goal: str = ""
    diet_goal: DietGoal
    diet_custom_text: str = ""

    @model_validator(mode="after")
    def _custom_goal_needs_text(self):
        if self.diet_goal == DietGoal.custom and not self.diet_custom_text.strip():
            raise ValueError("diet_custom_text is required when diet_goal is 'custom'")
        return self


class ProfileCreate(ProfileBase):
    # Starting bodyweight: stored as the first BodyweightEntry, not on the profile.
    weight_kg: float = Field(gt=20, lt=500)


class ProfileUpdate(ProfileBase):
    pass


class ProfileOut(ProfileBase):
    model_config = ConfigDict(from_attributes=True)


class MeOut(BaseModel):
    user: UserOut
    profile: ProfileOut | None = None


# --- Admin: access control ---


class AllowedEmailCreate(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.user
    note: str = Field(default="", max_length=255)


class AllowedEmailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: UserRole
    note: str
    created_at: datetime
    # True once someone has actually signed in with this email.
    registered: bool = False


class UserAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    role: UserRole
    created_at: datetime
