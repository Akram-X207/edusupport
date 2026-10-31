"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from app.models.models import UserRole, AttendanceStatus, SubmissionStatus, RiskCategory, InterventionStatus


# ---------------------------------------------------------------------------
# Auth Schemas
# ---------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ---------------------------------------------------------------------------
# User Schemas
# ---------------------------------------------------------------------------

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: UserRole = UserRole.FACULTY


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Subject Schemas
# ---------------------------------------------------------------------------

class SubjectBase(BaseModel):
    code: str
    name: str
    semester: int
    credits: int = 4
    description: Optional[str] = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    semester: Optional[int] = None
    credits: Optional[int] = None
    description: Optional[str] = None


class SubjectOut(SubjectBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Student Schemas
# ---------------------------------------------------------------------------

class StudentBase(BaseModel):
    prn: str
    full_name: str
    email: Optional[str] = None
    semester: int
    division: Optional[str] = None
    rollno: Optional[str] = None
    date_of_admission: Optional[date] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    semester: Optional[int] = None
    division: Optional[str] = None
    rollno: Optional[str] = None
    date_of_admission: Optional[date] = None
    is_active: Optional[bool] = None


class StudentOut(StudentBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentWithRisk(StudentOut):
    risk_category: Optional[str] = None
    risk_score: Optional[float] = None
    attendance_pct: Optional[float] = None
    avg_marks_pct: Optional[float] = None


# ---------------------------------------------------------------------------
# Enrollment Schemas
# ---------------------------------------------------------------------------

class EnrollmentCreate(BaseModel):
    student_id: int
    subject_id: int


class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    subject_id: int
    enrolled_at: datetime
    student: Optional[StudentOut] = None
    subject: Optional[SubjectOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Attendance Schemas
# ---------------------------------------------------------------------------

class AttendanceSessionCreate(BaseModel):
    subject_id: int
    session_date: date
    topic: Optional[str] = None


class AttendanceSessionOut(BaseModel):
    id: int
    subject_id: int
    session_date: date
    topic: Optional[str] = None
    created_at: datetime
    subject: Optional[SubjectOut] = None
    record_count: Optional[int] = None
    present_count: Optional[int] = None

    model_config = {"from_attributes": True}


class AttendanceRecordCreate(BaseModel):
    student_id: int
    status: AttendanceStatus
    remarks: Optional[str] = None


class BulkAttendanceCreate(BaseModel):
    session_id: int
    records: List[AttendanceRecordCreate]


class AttendanceRecordOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    status: AttendanceStatus
    remarks: Optional[str] = None
    student: Optional[StudentOut] = None

    model_config = {"from_attributes": True}


class StudentAttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    total_sessions: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    below_threshold: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Assessment Schemas
# ---------------------------------------------------------------------------

class AssessmentBase(BaseModel):
    subject_id: int
    name: str
    max_marks: float
    assessment_date: Optional[date] = None
    assessment_type: str = "exam"

    @field_validator("max_marks")
    @classmethod
    def max_marks_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Maximum marks must be greater than 0")
        return v


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    name: Optional[str] = None
    max_marks: Optional[float] = None
    assessment_date: Optional[date] = None
    assessment_type: Optional[str] = None


class AssessmentOut(AssessmentBase):
    id: int
    created_at: datetime
    subject: Optional[SubjectOut] = None

    model_config = {"from_attributes": True}


class AssessmentResultCreate(BaseModel):
    assessment_id: int
    student_id: int
    marks_obtained: float
    remarks: Optional[str] = None

    @field_validator("marks_obtained")
    @classmethod
    def marks_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Marks obtained cannot be negative")
        return v


class AssessmentResultUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    remarks: Optional[str] = None


class AssessmentResultOut(BaseModel):
    id: int
    assessment_id: int
    student_id: int
    marks_obtained: float
    percentage: Optional[float] = None
    remarks: Optional[str] = None
    entered_at: datetime
    student: Optional[StudentOut] = None
    assessment: Optional[AssessmentOut] = None

    model_config = {"from_attributes": True}


class BulkResultCreate(BaseModel):
    assessment_id: int
    results: List["SingleResultEntry"]


class SingleResultEntry(BaseModel):
    student_id: int
    marks_obtained: float
    remarks: Optional[str] = None


# ---------------------------------------------------------------------------
# Assignment Schemas
# ---------------------------------------------------------------------------

class AssignmentBase(BaseModel):
    subject_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    max_marks: Optional[float] = None


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    max_marks: Optional[float] = None


class AssignmentOut(AssignmentBase):
    id: int
    created_at: datetime
    subject: Optional[SubjectOut] = None

    model_config = {"from_attributes": True}


class SubmissionCreate(BaseModel):
    assignment_id: int
    student_id: int
    status: SubmissionStatus
    marks_obtained: Optional[float] = None
    submitted_at: Optional[datetime] = None
    remarks: Optional[str] = None


class SubmissionUpdate(BaseModel):
    status: Optional[SubmissionStatus] = None
    marks_obtained: Optional[float] = None
    submitted_at: Optional[datetime] = None
    remarks: Optional[str] = None


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    status: SubmissionStatus
    marks_obtained: Optional[float] = None
    submitted_at: Optional[datetime] = None
    remarks: Optional[str] = None
    student: Optional[StudentOut] = None
    assignment: Optional[AssignmentOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Risk Assessment Schemas
# ---------------------------------------------------------------------------

class RiskAssessmentOut(BaseModel):
    id: int
    student_id: int
    overall_score: Optional[float] = None
    category: RiskCategory
    attendance_score: Optional[float] = None
    marks_score: Optional[float] = None
    assignment_score: Optional[float] = None
    attendance_pct: Optional[float] = None
    avg_marks_pct: Optional[float] = None
    assignment_completion_pct: Optional[float] = None
    risk_factors: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    calculated_at: datetime
    student: Optional[StudentOut] = None

    @field_validator("risk_factors", "recommendations", mode="before")
    @classmethod
    def parse_json_list(cls, v):
        import json
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Intervention Schemas
# ---------------------------------------------------------------------------

class InterventionCreate(BaseModel):
    student_id: int
    issue_identified: str
    recommended_actions: Optional[str] = None
    faculty_notes: Optional[str] = None
    follow_up_date: Optional[date] = None


class InterventionUpdate(BaseModel):
    issue_identified: Optional[str] = None
    recommended_actions: Optional[str] = None
    faculty_notes: Optional[str] = None
    status: Optional[InterventionStatus] = None
    follow_up_date: Optional[date] = None


class InterventionOut(BaseModel):
    id: int
    student_id: int
    faculty_id: Optional[int] = None
    issue_identified: str
    recommended_actions: Optional[str] = None
    faculty_notes: Optional[str] = None
    status: InterventionStatus
    follow_up_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    student: Optional[StudentOut] = None
    faculty: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard Schemas
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_students: int
    active_students: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    insufficient_data_count: int
    avg_attendance_pct: float
    avg_marks_pct: float
    students_with_missing_assignments: int
    pending_interventions: int


class RiskDistributionItem(BaseModel):
    category: str
    count: int
    percentage: float


class SubjectPerformance(BaseModel):
    subject_name: str
    subject_code: str
    avg_marks_pct: float
    student_count: int


class AttentionStudent(BaseModel):
    student_id: int
    student_name: str
    prn: str
    risk_score: Optional[float]
    risk_category: str
    attendance_pct: Optional[float]
    avg_marks_pct: Optional[float]


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class PaginatedStudents(BaseModel):
    items: List[StudentWithRisk]
    total: int
    page: int
    page_size: int
    pages: int
