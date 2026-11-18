from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from app.schemas.common import NewPassword


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=200)


class SchoolBriefOut(BaseModel):
    id: int
    code: str
    name: str


class UserBriefOut(BaseModel):
    id: int
    full_name: str
    role: str
    school: SchoolBriefOut | None


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    must_change_password: bool
    user: UserBriefOut


class MeOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    school: SchoolBriefOut | None
    must_change_password: bool


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: NewPassword
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def _khac_mat_khau_cu(cls, gia_tri: str, info: ValidationInfo) -> str:
        if gia_tri == info.data.get("current_password"):
            raise ValueError("Mật khẩu mới phải khác mật khẩu hiện tại")
        return gia_tri

    @field_validator("confirm_password")
    @classmethod
    def _nhap_lai_khop(cls, gia_tri: str, info: ValidationInfo) -> str:
        if "new_password" in info.data and gia_tri != info.data["new_password"]:
            raise ValueError("Mật khẩu nhập lại không khớp với mật khẩu mới")
        return gia_tri
