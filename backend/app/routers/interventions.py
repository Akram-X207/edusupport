"""Interventions router."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Intervention, Student, User
from app.schemas.schemas import InterventionCreate, InterventionUpdate, InterventionOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/interventions", tags=["Interventions"])


@router.get("", response_model=List[InterventionOut])
@router.get("/", response_model=List[InterventionOut], include_in_schema=False)
def list_interventions(
    student_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Intervention)
    if student_id:
        q = q.filter(Intervention.student_id == student_id)
    if status:
        q = q.filter(Intervention.status == status)
    return q.order_by(Intervention.created_at.desc()).all()


@router.post("", response_model=InterventionOut, status_code=201)
@router.post("/", response_model=InterventionOut, status_code=201, include_in_schema=False)
def create_intervention(
    payload: InterventionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Student).filter(Student.id == payload.student_id).first():
        raise HTTPException(404, "Student not found")
    intervention = Intervention(
        **payload.model_dump(),
        faculty_id=current_user.id,
    )
    db.add(intervention)
    db.commit()
    db.refresh(intervention)
    return intervention


@router.get("/{intervention_id}", response_model=InterventionOut)
def get_intervention(intervention_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i:
        raise HTTPException(404, "Intervention not found")
    return i


@router.put("/{intervention_id}", response_model=InterventionOut)
def update_intervention(
    intervention_id: int,
    payload: InterventionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i:
        raise HTTPException(404, "Intervention not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(i, k, v)
    db.commit()
    db.refresh(i)
    return i


@router.delete("/{intervention_id}", status_code=204)
def delete_intervention(intervention_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i:
        raise HTTPException(404, "Intervention not found")
    db.delete(i)
    db.commit()
