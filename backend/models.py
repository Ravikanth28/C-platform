import datetime
import enum

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Enum, Float,
    ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import relationship

from database import Base


# ──────────────────────────── Enums ────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    student = "student"


class ProblemMode(str, enum.Enum):
    practice = "practice"
    test = "test"


# ──────────────────────────── Users ────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100))
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)
    is_active = Column(Boolean, default=True)
    avatar_color = Column(String(20), default="#6366f1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    notes_created = relationship("Note", back_populates="creator")
    note_assignments = relationship("NoteAssignment", back_populates="user")
    note_interactions = relationship("NoteInteraction", back_populates="user")
    submissions = relationship("Submission", back_populates="user")
    problem_assignments = relationship("ProblemAssignment", back_populates="user")


# ──────────────────────────── Notes ────────────────────────────────────────

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    upload_type = Column(String(20), nullable=False)   # pdf | docx | youtube | link
    file_url = Column(String(500))
    yt_link = Column(String(500))
    external_link = Column(String(500))
    file_size = Column(BigInteger)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_for_all = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    creator = relationship("User", back_populates="notes_created")
    assignments = relationship(
        "NoteAssignment", back_populates="note", cascade="all, delete-orphan"
    )
    interactions = relationship(
        "NoteInteraction", back_populates="note", cascade="all, delete-orphan"
    )


class NoteAssignment(Base):
    __tablename__ = "note_assignments"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)

    note = relationship("Note", back_populates="assignments")
    user = relationship("User", back_populates="note_assignments")


class NoteInteraction(Base):
    __tablename__ = "note_interactions"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    viewed = Column(Boolean, default=False)
    downloaded = Column(Boolean, default=False)
    viewed_at = Column(DateTime)
    downloaded_at = Column(DateTime)
    view_count = Column(Integer, default=0)

    note = relationship("Note", back_populates="interactions")
    user = relationship("User", back_populates="note_interactions")


# ──────────────────────────── Problems ─────────────────────────────────────

class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    topics = Column(String(500))
    mode = Column(Enum(ProblemMode), nullable=False)
    difficulty = Column(String(20), default="medium")
    created_by = Column(Integer, ForeignKey("users.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    duration = Column(Integer)            # minutes
    is_active = Column(Boolean, default=True)
    is_for_all = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    # Proctoring (test mode)
    tab_switch_detect = Column(Boolean, default=False)
    copy_paste_disable = Column(Boolean, default=False)
    f12_disable = Column(Boolean, default=False)
    fullscreen_required = Column(Boolean, default=False)

    test_cases = relationship(
        "TestCase", back_populates="problem", cascade="all, delete-orphan"
    )
    assignments = relationship(
        "ProblemAssignment", back_populates="problem", cascade="all, delete-orphan"
    )
    submissions = relationship("Submission", back_populates="problem")


class ProblemAssignment(Base):
    __tablename__ = "problem_assignments"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)

    problem = relationship("Problem", back_populates="assignments")
    user = relationship("User", back_populates="problem_assignments")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))
    input_data = Column(Text)
    expected_output = Column(Text)
    is_hidden = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)

    problem = relationship("Problem", back_populates="test_cases")


# ──────────────────────────── Submissions ──────────────────────────────────

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    code = Column(Text)
    language = Column(String(20), default="c")
    status = Column(String(30), default="Pending")
    score = Column(Float, default=0.0)
    time_taken = Column(Integer)          # seconds from test start
    execution_time = Column(Float)        # ms for last run
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    tab_switches = Column(Integer, default=0)
    test_cases_passed = Column(Integer, default=0)
    test_cases_total = Column(Integer, default=0)

    problem = relationship("Problem", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
    results = relationship(
        "SubmissionResult", back_populates="submission", cascade="all, delete-orphan"
    )


class SubmissionResult(Base):
    __tablename__ = "submission_results"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"))
    test_case_id = Column(Integer, ForeignKey("test_cases.id"))
    status = Column(String(30))           # Passed | Failed | TLE | Runtime Error
    actual_output = Column(Text)
    execution_time = Column(Float)        # ms

    submission = relationship("Submission", back_populates="results")


# ──────────────────────────── Classroom ────────────────────────────────────

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    members = relationship(
        "ClassMember", back_populates="klass", cascade="all, delete-orphan"
    )
    assignments = relationship(
        "Assignment", back_populates="klass", cascade="all, delete-orphan"
    )


class ClassMember(Base):
    __tablename__ = "class_members"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    klass = relationship("Class", back_populates="members")
    user = relationship("User")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    instructions = Column(Text)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"))
    due_date = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    klass = relationship("Class", back_populates="assignments")
    problems = relationship(
        "AssignmentProblem", back_populates="assignment", cascade="all, delete-orphan"
    )


class AssignmentProblem(Base):
    __tablename__ = "assignment_problems"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"))
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))

    assignment = relationship("Assignment", back_populates="problems")
    problem = relationship("Problem")
