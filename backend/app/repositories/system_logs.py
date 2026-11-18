from typing import Any

from sqlalchemy.orm import Session

from app.models import SystemLog


def add(
    db: Session,
    action: str,
    *,
    user_id: int | None,
    school_id: int | None,
    target_type: str | None = None,
    target_id: int | None = None,
    detail: dict[str, Any] | None = None,
) -> None:
    db.add(
        SystemLog(
            user_id=user_id,
            school_id=school_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )
