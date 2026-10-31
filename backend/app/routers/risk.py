"""
Risk router: compute and retrieve academic risk assessments.
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    Student, RiskAssessment, RiskCategory,
    AttendanceRecord, AttendanceStatus,
    AssessmentResult, Assessment,
    AssignmentSubmission, Assignment,
    User,
)
from app.schemas.schemas import RiskAssessmentOut
from app.utils.auth import get_current_user
from app.services.risk_engine import run_risk_engine

router = APIRouter(prefix="/api/risk", tags=["Risk Analysis"])


def _collect_student_data(student_id: int, db: Session) -> dict:
    """Collect all academic data needed for risk calculation."""
    # Attendance
    att_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    total_sessions = len(att_records)
    present_count = sum(1 for r in att_records if r.status == AttendanceStatus.PRESENT)

    # Marks
    results = (
        db.query(AssessmentResult, Assessment)
        .join(Assessment, AssessmentResult.assessment_id == Assessment.id)
        .filter(AssessmentResult.student_id == student_id)
        .all()
    )
    marks_data = [
        {"marks_obtained": r.marks_obtained, "max_marks": a.max_marks}
        for r, a in results
    ]

    # Assignments
    subs = (
        db.query(AssignmentSubmission, Assignment)
        .join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
        .filter(AssignmentSubmission.student_id == student_id)
        .all()
    )
    assignment_data = [
        {
            "status": s.status.value,
            "marks_obtained": s.marks_obtained,
            "max_marks": a.max_marks,
        }
        for s, a in subs
    ]

    return {
        "attendance": {"present_count": present_count, "total_sessions": total_sessions},
        "marks": marks_data,
        "assignments": assignment_data,
    }


def _compute_and_save_risk(student_id: int, db: Session) -> RiskAssessment:
    """Run the risk engine and persist the result."""
    data = _collect_student_data(student_id, db)
    result = run_risk_engine(
        student_id=student_id,
        attendance_data=data["attendance"],
        marks_data=data["marks"],
        assignment_data=data["assignments"],
    )

    category_map = {
        "low": RiskCategory.LOW,
        "medium": RiskCategory.MEDIUM,
        "high": RiskCategory.HIGH,
        "insufficient_data": RiskCategory.INSUFFICIENT_DATA,
    }

    ra = RiskAssessment(
        student_id=student_id,
        overall_score=result.overall_score,
        category=category_map[result.category],
        attendance_score=result.attendance_score,
        marks_score=result.marks_score,
        assignment_score=result.assignment_score,
        attendance_pct=result.attendance_pct,
        avg_marks_pct=result.avg_marks_pct,
        assignment_completion_pct=result.assignment_completion_pct,
        risk_factors=json.dumps(result.risk_factors),
        recommendations=json.dumps(result.recommendations),
    )
    db.add(ra)
    db.commit()
    db.refresh(ra)
    return ra


def _format_risk_out(ra: RiskAssessment) -> RiskAssessmentOut:
    """Convert a RiskAssessment ORM object to the output schema."""
    return RiskAssessmentOut.model_validate(ra)


@router.post("/calculate/{student_id}", response_model=RiskAssessmentOut)
def calculate_risk(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compute a fresh risk assessment for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    ra = _compute_and_save_risk(student_id, db)
    return _format_risk_out(ra)


@router.get("", response_model=List[RiskAssessmentOut])
@router.get("/", response_model=List[RiskAssessmentOut], include_in_schema=False)
def list_risk_assessments(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List latest risk assessments for all students, optionally filtered by category."""
    from sqlalchemy import func
    latest_subq = (
        db.query(
            RiskAssessment.student_id,
            func.max(RiskAssessment.calculated_at).label("latest"),
        )
        .group_by(RiskAssessment.student_id)
        .subquery()
    )
    q = (
        db.query(RiskAssessment)
        .join(
            latest_subq,
            (RiskAssessment.student_id == latest_subq.c.student_id)
            & (RiskAssessment.calculated_at == latest_subq.c.latest),
        )
    )
    if category:
        q = q.filter(RiskAssessment.category == category)
    records = q.order_by(RiskAssessment.overall_score.desc()).all()
    return [_format_risk_out(r) for r in records]


@router.post("/calculate-all", status_code=200)
@router.post("/calculate/all", status_code=200)
def calculate_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recalculate risk assessments for ALL active students."""
    students = db.query(Student).filter(Student.is_active == True).all()
    results = {"processed": 0, "errors": []}

    for student in students:
        try:
            _compute_and_save_risk(student.id, db)
            results["processed"] += 1
        except Exception as e:
            results["errors"].append({"student_id": student.id, "error": str(e)})

    return results


@router.get("/student/{student_id}", response_model=RiskAssessmentOut)
def get_latest_risk(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent risk assessment for a student."""
    ra = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.student_id == student_id)
        .order_by(RiskAssessment.calculated_at.desc())
        .first()
    )
    if not ra:
        raise HTTPException(404, "No risk assessment found. Use POST /calculate/{student_id} first.")
    return _format_risk_out(ra)


@router.get("/student/{student_id}/history", response_model=List[RiskAssessmentOut])
def risk_history(
    student_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical risk assessments for a student."""
    records = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.student_id == student_id)
        .order_by(RiskAssessment.calculated_at.desc())
        .limit(limit)
        .all()
    )
    return [_format_risk_out(r) for r in records]


@router.get("/high-risk", response_model=List[RiskAssessmentOut])
def high_risk_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the latest risk assessments for all high-risk students."""
    from sqlalchemy import func

    # Subquery to get the latest risk assessment ID per student
    latest_subq = (
        db.query(
            RiskAssessment.student_id,
            func.max(RiskAssessment.calculated_at).label("latest"),
        )
        .group_by(RiskAssessment.student_id)
        .subquery()
    )

    records = (
        db.query(RiskAssessment)
        .join(
            latest_subq,
            (RiskAssessment.student_id == latest_subq.c.student_id)
            & (RiskAssessment.calculated_at == latest_subq.c.latest),
        )
        .filter(RiskAssessment.category == RiskCategory.HIGH)
        .all()
    )
    return [_format_risk_out(r) for r in records]
