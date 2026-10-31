"""Subjects router."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Subject, User
from app.schemas.schemas import SubjectCreate, SubjectUpdate, SubjectOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])


@router.get("", response_model=List[SubjectOut])
@router.get("/", response_model=List[SubjectOut], include_in_schema=False)
def list_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Subject).order_by(Subject.semester, Subject.name).all()


@router.post("", response_model=SubjectOut, status_code=201)
@router.post("/", response_model=SubjectOut, status_code=201, include_in_schema=False)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Subject).filter(Subject.code == payload.code).first()
    if existing:
        raise HTTPException(400, f"Subject with code '{payload.code}' already exists")
    subject = Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    return s


@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, payload: SubjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    db.delete(s)
    db.commit()
