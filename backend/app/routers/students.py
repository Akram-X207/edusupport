"""
Students router: CRUD, search, filter, CSV import/export.
"""
import csv
import io
from typing import Optional, List
from fastapi import (
    APIRouter, Depends, HTTPException, status, Query,
    UploadFile, File
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models.models import Student, RiskAssessment, RiskCategory
from app.schemas.schemas import (
    StudentCreate, StudentUpdate, StudentOut, StudentWithRisk, PaginatedStudents
)
from app.utils.auth import get_current_user
from app.models.models import User

router = APIRouter(prefix="/api/students", tags=["Students"])


def _get_latest_risk(db: Session, student_id: int) -> Optional[RiskAssessment]:
    return (
        db.query(RiskAssessment)
        .filter(RiskAssessment.student_id == student_id)
        .order_by(RiskAssessment.calculated_at.desc())
        .first()
    )


def _enrich_with_risk(student: Student, db: Session) -> StudentWithRisk:
    risk = _get_latest_risk(db, student.id)
    data = StudentOut.model_validate(student).model_dump()
    data["risk_category"] = risk.category.value if risk else None
    data["risk_score"] = risk.overall_score if risk else None
    data["attendance_pct"] = risk.attendance_pct if risk else None
    data["avg_marks_pct"] = risk.avg_marks_pct if risk else None
    return StudentWithRisk(**data)


@router.get("", response_model=PaginatedStudents)
@router.get("/", response_model=PaginatedStudents, include_in_schema=False)
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    semester: Optional[int] = None,
    division: Optional[str] = None,
    risk_category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all students with optional filtering, search, and pagination."""
    q = db.query(Student)

    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                Student.full_name.ilike(pattern),
                Student.prn.ilike(pattern),
                Student.email.ilike(pattern),
            )
        )
    if semester:
        q = q.filter(Student.semester == semester)
    if division:
        q = q.filter(Student.division.ilike(f"%{division}%"))

    total = q.count()
    students = q.order_by(Student.full_name).offset((page - 1) * page_size).limit(page_size).all()

    items = [_enrich_with_risk(s, db) for s in students]

    # Filter by risk category after enrichment if requested
    if risk_category:
        items = [i for i in items if i.risk_category == risk_category]

    import math
    return PaginatedStudents(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new student record."""
    clean_prn = payload.prn.strip()
    existing = db.query(Student).filter(Student.prn == clean_prn).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with PRN '{clean_prn}' already exists")

    data = payload.model_dump()
    data["prn"] = clean_prn
    if not data.get("email") or data["email"].strip() == "":
        data["email"] = None
    if not data.get("rollno") or data["rollno"].strip() == "":
        data["rollno"] = None

    from app.models.models import Subject, Enrollment
    student = Student(**data)
    db.add(student)
    db.commit()
    db.refresh(student)

    # Auto-enroll in subjects for the student's semester
    subjects = db.query(Subject).filter(Subject.semester == student.semester).all()
    for subj in subjects:
        db.add(Enrollment(student_id=student.id, subject_id=subj.id))
    db.commit()

    return student


@router.get("/{student_id}", response_model=StudentWithRisk)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a student by ID."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return _enrich_with_risk(student, db)


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update student details."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a student record."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()


@router.post("/import/csv", status_code=status.HTTP_201_CREATED)
def import_students_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import students from a CSV file.
    Expected columns: prn, full_name, email, semester, division, rollno
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    required_cols = {"prn", "full_name", "semester"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {required_cols}",
        )

    created = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            prn = row["prn"].strip()
            if not prn:
                errors.append(f"Row {i}: PRN is empty")
                continue

            existing = db.query(Student).filter(Student.prn == prn).first()
            if existing:
                skipped += 1
                continue

            student = Student(
                prn=prn,
                full_name=row["full_name"].strip(),
                email=row.get("email", "").strip() or None,
                semester=int(row["semester"]),
                division=row.get("division", "").strip() or None,
                rollno=row.get("rollno", "").strip() or None,
            )
            db.add(student)
            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()
    return {
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }


@router.get("/export/csv")
def export_students_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all students as a CSV file."""
    students = db.query(Student).order_by(Student.full_name).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["prn", "full_name", "email", "semester", "division", "rollno"])
    for s in students:
        writer.writerow([s.prn, s.full_name, s.email or "", s.semester, s.division or "", s.rollno or ""])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students.csv"},
    )
