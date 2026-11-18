from pydantic import BaseModel


class ResetPasswordOut(BaseModel):
    """Mật khẩu mới chỉ trả một lần, không lưu ở đâu khác ngoài bản băm."""

    user_id: int
    username: str
    new_password: str
