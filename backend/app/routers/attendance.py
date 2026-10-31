"""
Attendance router: session management, bulk record entry, summaries.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    AttendanceSession, AttendanceRecord, Student, Subject,
    AttendanceStatus, User
)
from app.schemas.schemas import (
    AttendanceSessionCreate, AttendanceSessionOut,
    BulkAttendanceCreate, AttendanceRecordOut,
    StudentAttendanceSummary,
)
from app.utils.auth import get_current_user
from app.services.attendance_service import build_attendance_summary

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


# -----------------------------------------------------------------------
# Sessions
# -----------------------------------------------------------------------

@router.get("/sessions", response_model=List[AttendanceSessionOut])
def list_sessions(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AttendanceSession)
    if subject_id:
        q = q.filter(AttendanceSession.subject_id == subject_id)
    sessions = q.order_by(AttendanceSession.session_date.desc()).all()

    result = []
    for s in sessions:
        out = AttendanceSessionOut.model_validate(s)
        out.record_count = len(s.records)
        out.present_count = sum(1 for r in s.records if r.status == AttendanceStatus.PRESENT)
        result.append(out)
    return result


@router.post("/sessions", response_model=AttendanceSessionOut, status_code=201)
def create_session(
    payload: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")

    session = AttendanceSession(
        subject_id=payload.subject_id,
        session_date=payload.session_date,
        topic=payload.topic,
        created_by=current_user.id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=AttendanceSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    out = AttendanceSessionOut.model_validate(s)
    out.record_count = len(s.records)
    out.present_count = sum(1 for r in s.records if r.status == AttendanceStatus.PRESENT)
    return out


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    db.commit()


# -----------------------------------------------------------------------
# Records
# -----------------------------------------------------------------------

@router.post("/sessions/{session_id}/records", status_code=201)
@router.post("/records/bulk", status_code=201)
def bulk_create_records(
    payload: BulkAttendanceCreate,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit or update attendance records for an entire session."""
    target_session_id = payload.session_id or session_id
    session = db.query(AttendanceSession).filter(AttendanceSession.id == target_session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")

    upserted = 0
    for rec in payload.records:
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.session_id == target_session_id,
                AttendanceRecord.student_id == rec.student_id,
            )
            .first()
        )
        if existing:
            existing.status = rec.status
            existing.remarks = rec.remarks
        else:
            new_rec = AttendanceRecord(
                session_id=target_session_id,
                student_id=rec.student_id,
                status=rec.status,
                remarks=rec.remarks,
            )
            db.add(new_rec)
        upserted += 1

    db.commit()
    return {"upserted": upserted}


@router.get("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
@router.get("/records/session/{session_id}", response_model=List[AttendanceRecordOut])
def get_records_for_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.session_id == session_id)
        .all()
    )


@router.get("/student/{student_id}", response_model=List[AttendanceRecordOut])
def student_attendance_records(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all attendance records for a student."""
    return db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()


@router.get("/summary/student/{student_id}", response_model=StudentAttendanceSummary)
def student_attendance_summary(
    student_id: int,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance summary for a single student, optionally filtered by subject."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    q = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id)
    if subject_id:
        q = q.join(AttendanceSession).filter(AttendanceSession.subject_id == subject_id)

    records = q.all()
    total = len(records)
    present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)

    summary = build_attendance_summary(student_id, student.full_name, present, total)
    return StudentAttendanceSummary(**summary)


@router.get("/subject/{subject_id}/summary", response_model=List[StudentAttendanceSummary])
@router.get("/summary/class", response_model=List[StudentAttendanceSummary])
def class_attendance_summary(
    subject_id: Optional[int] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance summaries for all students."""
    students = db.query(Student).filter(Student.is_active == True)
    if semester:
        students = students.filter(Student.semester == semester)
    students = students.all()

    summaries = []
    for student in students:
        q = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id)
        if subject_id:
            q = q.join(AttendanceSession).filter(AttendanceSession.subject_id == subject_id)
        records = q.all()
        total = len(records)
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        summary = build_attendance_summary(student.id, student.full_name, present, total)
        summaries.append(StudentAttendanceSummary(**summary))

    return summaries
