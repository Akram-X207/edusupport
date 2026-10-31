"""Assignments router: manage assignments and student submissions."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Assignment, AssignmentSubmission, Student, Subject, User, SubmissionStatus
from app.schemas.schemas import (
    AssignmentCreate, AssignmentUpdate, AssignmentOut,
    SubmissionCreate, SubmissionUpdate, SubmissionOut,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


@router.get("", response_model=List[AssignmentOut])
@router.get("/", response_model=List[AssignmentOut], include_in_schema=False)
def list_assignments(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Assignment)
    if subject_id:
        q = q.filter(Assignment.subject_id == subject_id)
    return q.order_by(Assignment.due_date.desc()).all()


@router.post("", response_model=AssignmentOut, status_code=201)
@router.post("/", response_model=AssignmentOut, status_code=201, include_in_schema=False)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subj:
        raise HTTPException(404, "Subject not found")
    assignment = Assignment(**payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/{assignment_id}", response_model=AssignmentOut)
def get_assignment(assignment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    return a


@router.put("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(assignment_id: int, payload: AssignmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    db.delete(a)
    db.commit()


# ---- Submissions ----

@router.get("/{assignment_id}/submissions", response_model=List[SubmissionOut])
def get_submissions(assignment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == assignment_id).all()


@router.post("/submissions", response_model=SubmissionOut, status_code=201)
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(Assignment).filter(Assignment.id == payload.assignment_id).first()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    if not db.query(Student).filter(Student.id == payload.student_id).first():
        raise HTTPException(404, "Student not found")

    if payload.marks_obtained is not None and assignment.max_marks is not None:
        if payload.marks_obtained > assignment.max_marks:
            raise HTTPException(400, "Marks obtained exceed maximum marks")
        if payload.marks_obtained < 0:
            raise HTTPException(400, "Marks cannot be negative")

    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == payload.assignment_id,
        AssignmentSubmission.student_id == payload.student_id,
    ).first()
    if existing:
        raise HTTPException(400, "Submission already exists. Use PUT to update.")

    sub = AssignmentSubmission(**payload.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/submissions/{submission_id}", response_model=SubmissionOut)
def update_submission(submission_id: int, payload: SubmissionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not s:
        raise HTTPException(404, "Submission not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.get("/student/{student_id}", response_model=List[SubmissionOut])
@router.get("/submissions/student/{student_id}", response_model=List[SubmissionOut])
def student_submissions(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AssignmentSubmission).filter(AssignmentSubmission.student_id == student_id).all()
