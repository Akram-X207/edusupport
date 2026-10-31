"""Assessments router: manage exams, quizzes, and their results."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Assessment, AssessmentResult, Student, Subject, User
from app.schemas.schemas import (
    AssessmentCreate, AssessmentUpdate, AssessmentOut,
    AssessmentResultCreate, AssessmentResultUpdate, AssessmentResultOut,
    BulkResultCreate,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


# ---- Assessments ----

@router.get("", response_model=List[AssessmentOut])
@router.get("/", response_model=List[AssessmentOut], include_in_schema=False)
def list_assessments(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Assessment)
    if subject_id:
        q = q.filter(Assessment.subject_id == subject_id)
    return q.order_by(Assessment.assessment_date.desc()).all()


@router.post("", response_model=AssessmentOut, status_code=201)
@router.post("/", response_model=AssessmentOut, status_code=201, include_in_schema=False)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subj:
        raise HTTPException(404, "Subject not found")
    assessment = Assessment(**payload.model_dump())
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(assessment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    return a


@router.put("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(assessment_id: int, payload: AssessmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    db.delete(a)
    db.commit()


# ---- Results ----

@router.get("/{assessment_id}/results", response_model=List[AssessmentResultOut])
def get_results(assessment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    results = db.query(AssessmentResult).filter(AssessmentResult.assessment_id == assessment_id).all()
    out = []
    for r in results:
        d = AssessmentResultOut.model_validate(r)
        d.percentage = round((r.marks_obtained / a.max_marks) * 100, 2)
        out.append(d)
    return out


@router.post("/results", response_model=AssessmentResultOut, status_code=201)
def add_result(
    payload: AssessmentResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == payload.assessment_id).first()
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    if payload.marks_obtained > assessment.max_marks:
        raise HTTPException(400, f"Marks obtained ({payload.marks_obtained}) exceeds maximum marks ({assessment.max_marks})")
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    existing = db.query(AssessmentResult).filter(
        AssessmentResult.assessment_id == payload.assessment_id,
        AssessmentResult.student_id == payload.student_id,
    ).first()
    if existing:
        raise HTTPException(400, "Result already exists for this student. Use PUT to update.")

    result = AssessmentResult(**payload.model_dump())
    db.add(result)
    db.commit()
    db.refresh(result)
    out = AssessmentResultOut.model_validate(result)
    out.percentage = round((result.marks_obtained / assessment.max_marks) * 100, 2)
    return out


@router.post("/{assessment_id}/results", status_code=201)
@router.post("/results/bulk", status_code=201)
def bulk_add_results(
    payload: BulkResultCreate,
    assessment_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_id = payload.assessment_id or assessment_id
    assessment = db.query(Assessment).filter(Assessment.id == target_id).first()
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    created = 0
    updated = 0
    errors = []

    for entry in payload.results:
        if entry.marks_obtained > assessment.max_marks:
            errors.append(f"Student {entry.student_id}: marks ({entry.marks_obtained}) exceed max ({assessment.max_marks})")
            continue
        if entry.marks_obtained < 0:
            errors.append(f"Student {entry.student_id}: marks cannot be negative")
            continue

        existing = db.query(AssessmentResult).filter(
            AssessmentResult.assessment_id == payload.assessment_id,
            AssessmentResult.student_id == entry.student_id,
        ).first()

        if existing:
            existing.marks_obtained = entry.marks_obtained
            existing.remarks = entry.remarks
            updated += 1
        else:
            r = AssessmentResult(
                assessment_id=payload.assessment_id,
                student_id=entry.student_id,
                marks_obtained=entry.marks_obtained,
                remarks=entry.remarks,
            )
            db.add(r)
            created += 1

    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


@router.put("/results/{result_id}", response_model=AssessmentResultOut)
def update_result(result_id: int, payload: AssessmentResultUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(AssessmentResult).filter(AssessmentResult.id == result_id).first()
    if not r:
        raise HTTPException(404, "Result not found")
    if payload.marks_obtained is not None:
        assessment = db.query(Assessment).filter(Assessment.id == r.assessment_id).first()
        if payload.marks_obtained > assessment.max_marks:
            raise HTTPException(400, "Marks exceed maximum")
        if payload.marks_obtained < 0:
            raise HTTPException(400, "Marks cannot be negative")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    out = AssessmentResultOut.model_validate(r)
    assessment = db.query(Assessment).filter(Assessment.id == r.assessment_id).first()
    out.percentage = round((r.marks_obtained / assessment.max_marks) * 100, 2)
    return out


@router.get("/student/{student_id}", response_model=List[AssessmentResultOut])
@router.get("/results/student/{student_id}", response_model=List[AssessmentResultOut])
def student_results(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(AssessmentResult).filter(AssessmentResult.student_id == student_id).all()
    out = []
    for r in results:
        assessment = db.query(Assessment).filter(Assessment.id == r.assessment_id).first()
        d = AssessmentResultOut.model_validate(r)
        if assessment and assessment.max_marks > 0:
            d.percentage = round((r.marks_obtained / assessment.max_marks) * 100, 2)
        out.append(d)
    return out
