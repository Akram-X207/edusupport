"""
SQLAlchemy ORM models for EduSupport.
All 12 database entities are defined here with relationships and constraints.
"""
from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text,
    ForeignKey, DateTime, Date, Enum as SAEnum, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FACULTY = "faculty"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"


class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    LATE = "late"
    MISSING = "missing"


class RiskCategory(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    INSUFFICIENT_DATA = "insufficient_data"


class InterventionStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# ---------------------------------------------------------------------------
# User model
# ---------------------------------------------------------------------------

class User(Base):
    """Academic staff who can log in to EduSupport."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.FACULTY, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    interventions = relationship("Intervention", back_populates="faculty")


# ---------------------------------------------------------------------------
# Subject model
# ---------------------------------------------------------------------------

class Subject(Base):
    """Academic subjects/courses offered."""
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)
    credits = Column(Integer, default=4)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="subject")
    attendance_sessions = relationship("AttendanceSession", back_populates="subject")
    assessments = relationship("Assessment", back_populates="subject")
    assignments = relationship("Assignment", back_populates="subject")


# ---------------------------------------------------------------------------
# Student model
# ---------------------------------------------------------------------------

class Student(Base):
    """Enrolled student record."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    prn = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    semester = Column(Integer, nullable=False)
    division = Column(String(10), nullable=True)
    rollno = Column(String(20), nullable=True)
    date_of_admission = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="student")
    attendance_records = relationship("AttendanceRecord", back_populates="student")
    assessment_results = relationship("AssessmentResult", back_populates="student")
    assignment_submissions = relationship("AssignmentSubmission", back_populates="student")
    risk_assessments = relationship("RiskAssessment", back_populates="student",
                                    order_by="RiskAssessment.calculated_at.desc()")
    interventions = relationship("Intervention", back_populates="student")


# ---------------------------------------------------------------------------
# Enrollment model
# ---------------------------------------------------------------------------

class Enrollment(Base):
    """Maps students to subjects."""
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "subject_id", name="uq_student_subject"),
    )

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")


# ---------------------------------------------------------------------------
# Attendance Session model
# ---------------------------------------------------------------------------

class AttendanceSession(Base):
    """A class/lecture session for which attendance is taken."""
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    session_date = Column(Date, nullable=False)
    topic = Column(String(200), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="attendance_sessions")
    records = relationship("AttendanceRecord", back_populates="session",
                           cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Attendance Record model
# ---------------------------------------------------------------------------

class AttendanceRecord(Base):
    """Individual student attendance for a session."""
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
                        nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(AttendanceStatus), default=AttendanceStatus.ABSENT, nullable=False)
    remarks = Column(String(200), nullable=True)

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
        Index("ix_ar_student", "student_id"),
    )

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")


# ---------------------------------------------------------------------------
# Assessment model
# ---------------------------------------------------------------------------

class Assessment(Base):
    """An exam or test for a subject."""
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    max_marks = Column(Float, nullable=False)
    assessment_date = Column(Date, nullable=True)
    assessment_type = Column(String(50), default="exam")  # exam, quiz, practical, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="assessments")
    results = relationship("AssessmentResult", back_populates="assessment",
                           cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Assessment Result model
# ---------------------------------------------------------------------------

class AssessmentResult(Base):
    """A student's marks for a specific assessment."""
    __tablename__ = "assessment_results"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"),
                           nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    marks_obtained = Column(Float, nullable=False)
    remarks = Column(String(200), nullable=True)
    entered_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("assessment_id", "student_id", name="uq_assessment_student"),
    )

    assessment = relationship("Assessment", back_populates="results")
    student = relationship("Student", back_populates="assessment_results")


# ---------------------------------------------------------------------------
# Assignment model
# ---------------------------------------------------------------------------

class Assignment(Base):
    """An assignment issued to a class."""
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    max_marks = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="assignments")
    submissions = relationship("AssignmentSubmission", back_populates="assignment",
                               cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Assignment Submission model
# ---------------------------------------------------------------------------

class AssignmentSubmission(Base):
    """Tracks a student's submission for an assignment."""
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"),
                           nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(SubmissionStatus), default=SubmissionStatus.MISSING, nullable=False)
    marks_obtained = Column(Float, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    remarks = Column(String(200), nullable=True)

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student"),
    )

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="assignment_submissions")


# ---------------------------------------------------------------------------
# Risk Assessment model
# ---------------------------------------------------------------------------

class RiskAssessment(Base):
    """Stores the computed risk scores for a student at a point in time."""
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, nullable=True)
    category = Column(SAEnum(RiskCategory), default=RiskCategory.INSUFFICIENT_DATA)
    attendance_score = Column(Float, nullable=True)
    marks_score = Column(Float, nullable=True)
    assignment_score = Column(Float, nullable=True)
    attendance_pct = Column(Float, nullable=True)
    avg_marks_pct = Column(Float, nullable=True)
    assignment_completion_pct = Column(Float, nullable=True)
    risk_factors = Column(Text, nullable=True)       # JSON string list of risk factor descriptions
    recommendations = Column(Text, nullable=True)    # JSON string list of recommendations
    calculated_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="risk_assessments")

    Index("ix_ra_student_date", "student_id", "calculated_at")


# ---------------------------------------------------------------------------
# Intervention model
# ---------------------------------------------------------------------------

class Intervention(Base):
    """Tracks faculty academic support interventions for students."""
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    issue_identified = Column(Text, nullable=False)
    recommended_actions = Column(Text, nullable=True)
    faculty_notes = Column(Text, nullable=True)
    status = Column(SAEnum(InterventionStatus), default=InterventionStatus.PENDING)
    follow_up_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="interventions")
    faculty = relationship("User", back_populates="interventions")
