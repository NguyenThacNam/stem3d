# Nhập Base và mọi model tại đây để Alembic autogenerate thấy đủ 15 bảng.
from app.models.assets import Asset
from app.models.assignments import Assignment
from app.models.attempts import Attempt
from app.models.base import Base
from app.models.class_students import ClassStudent
from app.models.class_teachers import ClassTeacher
from app.models.classes import SchoolClass
from app.models.lesson_parts import LessonPart
from app.models.lessons import Lesson
from app.models.questions import Question
from app.models.schools import School
from app.models.student_profiles import StudentProfile
from app.models.subjects import Subject
from app.models.system_logs import SystemLog
from app.models.teacher_profiles import TeacherProfile
from app.models.users import User

__all__ = [
    "Asset",
    "Assignment",
    "Attempt",
    "Base",
    "ClassStudent",
    "ClassTeacher",
    "LessonPart",
    "Lesson",
    "Question",
    "School",
    "SchoolClass",
    "StudentProfile",
    "Subject",
    "SystemLog",
    "TeacherProfile",
    "User",
]
