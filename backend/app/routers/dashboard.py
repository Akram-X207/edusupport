"""
Dashboard and Reports router.
"""
import json
from typing import List
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import io

from app.database import get_db
from app.models.models import (
    Student, RiskAssessment, RiskCategory,
    AttendanceRecord, AttendanceStatus,
    AssessmentResult, Assessment,
    AssignmentSubmission, SubmissionStatus,
    Intervention, InterventionStatus,
    Subject, User,
)
from app.schemas.schemas import (
    DashboardStats, RiskDistributionItem, SubjectPerformance, AttentionStudent,
)
from app.utils.auth import get_current_user
from app.services.report_service import student_risk_report, attendance_report, marks_report, assignment_report

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
reports_router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _get_latest_risk_subquery(db: Session):
    """Return a subquery for the latest risk assessment per student."""
    return (
        db.query(
            RiskAssessment.student_id,
            func.max(RiskAssessment.calculated_at).label("latest"),
        )
        .group_by(RiskAssessment.student_id)
        .subquery()
    )


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all aggregated statistics for the main dashboard."""
    total_students = db.query(Student).count()
    active_students = db.query(Student).filter(Student.is_active == True).count()

    # Latest risk assessment per student
    latest_subq = _get_latest_risk_subquery(db)
    latest_risks = (
        db.query(RiskAssessment)
        .join(latest_subq, (RiskAssessment.student_id == latest_subq.c.student_id)
              & (RiskAssessment.calculated_at == latest_subq.c.latest))
        .all()
    )

    category_counts = {
        "high": 0, "medium": 0, "low": 0, "insufficient_data": 0
    }
    for ra in latest_risks:
        category_counts[ra.category.value] += 1

    # Average attendance
    att_records = db.query(AttendanceRecord).all()
    if att_records:
        total_att = len(att_records)
        present_att = sum(1 for r in att_records if r.status == AttendanceStatus.PRESENT)
        avg_att = round((present_att / total_att) * 100, 2)
    else:
        avg_att = 0.0

    # Average marks
    results_with_assessment = (
        db.query(AssessmentResult, Assessment)
        .join(Assessment, AssessmentResult.assessment_id == Assessment.id)
        .all()
    )
    if results_with_assessment:
        percentages = [
            (r.marks_obtained / a.max_marks) * 100
            for r, a in results_with_assessment
            if a.max_marks > 0
        ]
        avg_marks = round(sum(percentages) / len(percentages), 2) if percentages else 0.0
    else:
        avg_marks = 0.0

    # Students with missing assignments
    missing_sub_student_ids = (
        db.query(AssignmentSubmission.student_id)
        .filter(AssignmentSubmission.status == SubmissionStatus.MISSING)
        .distinct()
        .count()
    )

    # Pending interventions
    pending_interventions = db.query(Intervention).filter(
        Intervention.status == InterventionStatus.PENDING
    ).count()

    return DashboardStats(
        total_students=total_students,
        active_students=active_students,
        high_risk_count=category_counts["high"],
        medium_risk_count=category_counts["medium"],
        low_risk_count=category_counts["low"],
        insufficient_data_count=category_counts["insufficient_data"],
        avg_attendance_pct=avg_att,
        avg_marks_pct=avg_marks,
        students_with_missing_assignments=missing_sub_student_ids,
        pending_interventions=pending_interventions,
    )


@router.get("/risk-distribution", response_model=List[RiskDistributionItem])
def risk_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return risk category distribution for charts."""
    latest_subq = _get_latest_risk_subquery(db)
    latest_risks = (
        db.query(RiskAssessment)
        .join(latest_subq, (RiskAssessment.student_id == latest_subq.c.student_id)
              & (RiskAssessment.calculated_at == latest_subq.c.latest))
        .all()
    )
    total = len(latest_risks) or 1
    counts = {"High Risk": 0, "Medium Risk": 0, "Low Risk": 0, "Insufficient Data": 0}
    for ra in latest_risks:
        label = ra.category.value.replace("_", " ").title()
        if label in counts:
            counts[label] += 1

    return [
        RiskDistributionItem(
            category=k,
            count=v,
            percentage=round((v / total) * 100, 1),
        )
        for k, v in counts.items()
    ]


@router.get("/subject-performance", response_model=List[SubjectPerformance])
def subject_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return per-subject average assessment performance."""
    subjects = db.query(Subject).all()
    result = []
    for subj in subjects:
        assessments = db.query(Assessment).filter(Assessment.subject_id == subj.id).all()
        all_pcts = []
        student_ids = set()
        for a in assessments:
            for r in a.results:
                if a.max_marks > 0:
                    all_pcts.append((r.marks_obtained / a.max_marks) * 100)
                    student_ids.add(r.student_id)
        if all_pcts:
            result.append(SubjectPerformance(
                subject_name=subj.name,
                subject_code=subj.code,
                avg_marks_pct=round(sum(all_pcts) / len(all_pcts), 2),
                student_count=len(student_ids),
            ))
    return result


@router.get("/attention-students", response_model=List[AttentionStudent])
@router.get("/attention-required", response_model=List[AttentionStudent])
def attention_required(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return top students requiring immediate attention (high risk, sorted by score)."""
    latest_subq = _get_latest_risk_subquery(db)
    records = (
        db.query(RiskAssessment, Student)
        .join(latest_subq, (RiskAssessment.student_id == latest_subq.c.student_id)
              & (RiskAssessment.calculated_at == latest_subq.c.latest))
        .join(Student, Student.id == RiskAssessment.student_id)
        .filter(RiskAssessment.category.in_([RiskCategory.HIGH, RiskCategory.MEDIUM]))
        .order_by(RiskAssessment.overall_score.desc())
        .limit(limit)
        .all()
    )
    return [
        AttentionStudent(
            student_id=s.id,
            student_name=s.full_name,
            prn=s.prn,
            risk_score=ra.overall_score,
            risk_category=ra.category.value,
            attendance_pct=ra.attendance_pct,
            avg_marks_pct=ra.avg_marks_pct,
        )
        for ra, s in records
    ]


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@reports_router.get("/risk/csv")
def risk_report_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    latest_subq = _get_latest_risk_subquery(db)
    records = (
        db.query(RiskAssessment, Student)
        .join(latest_subq, (RiskAssessment.student_id == latest_subq.c.student_id)
              & (RiskAssessment.calculated_at == latest_subq.c.latest))
        .join(Student, Student.id == RiskAssessment.student_id)
        .all()
    )
    data = []
    for ra, s in records:
        factors = json.loads(ra.risk_factors) if ra.risk_factors else []
        data.append({
            "prn": s.prn,
            "full_name": s.full_name,
            "semester": s.semester,
            "division": s.division or "",
            "risk_category": ra.category.value,
            "overall_score": ra.overall_score,
            "attendance_pct": ra.attendance_pct,
            "avg_marks_pct": ra.avg_marks_pct,
            "assignment_completion_pct": ra.assignment_completion_pct,
            "risk_factors": factors,
        })
    csv_content = student_risk_report(data)
    return StreamingResponse(
        io.BytesIO(csv_content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=risk_report.csv"},
    )


@reports_router.get("/attendance/csv")
def attendance_report_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    students = db.query(Student).filter(Student.is_active == True).all()
    data = []
    for s in students:
        records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).all()
        total = len(records)
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        pct = round((present / total) * 100, 2) if total > 0 else 0.0
        from app.config import settings
        data.append({
            "prn": s.prn,
            "student_name": s.full_name,
            "total_sessions": total,
            "present_count": present,
            "absent_count": total - present,
            "attendance_percentage": pct,
            "below_threshold": pct < settings.MIN_ATTENDANCE_PERCENT,
        })
    csv_content = attendance_report(data)
    return StreamingResponse(
        io.BytesIO(csv_content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_report.csv"},
    )


@reports_router.get("/marks/csv")
def marks_report_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = (
        db.query(AssessmentResult, Assessment, Subject, Student)
        .join(Assessment, AssessmentResult.assessment_id == Assessment.id)
        .join(Subject, Assessment.subject_id == Subject.id)
        .join(Student, AssessmentResult.student_id == Student.id)
        .all()
    )
    data = [
        {
            "prn": s.prn,
            "student_name": s.full_name,
            "subject_name": subj.name,
            "assessment_name": a.name,
            "marks_obtained": r.marks_obtained,
            "max_marks": a.max_marks,
            "percentage": round((r.marks_obtained / a.max_marks) * 100, 2) if a.max_marks > 0 else 0,
        }
        for r, a, subj, s in results
    ]
    csv_content = marks_report(data)
    return StreamingResponse(
        io.BytesIO(csv_content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=marks_report.csv"},
    )


@reports_router.get("/assignments/csv")
def assignment_report_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Assignment as Assign
    subs = (
        db.query(AssignmentSubmission, Assign, Subject, Student)
        .join(Assign, AssignmentSubmission.assignment_id == Assign.id)
        .join(Subject, Assign.subject_id == Subject.id)
        .join(Student, AssignmentSubmission.student_id == Student.id)
        .all()
    )
    data = [
        {
            "prn": s.prn,
            "student_name": s.full_name,
            "subject_name": subj.name,
            "assignment_title": a.title,
            "due_date": str(a.due_date) if a.due_date else "",
            "status": sub.status.value,
            "marks_obtained": sub.marks_obtained or "",
        }
        for sub, a, subj, s in subs
    ]
    csv_content = assignment_report(data)
    return StreamingResponse(
        io.BytesIO(csv_content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assignment_report.csv"},
    )
