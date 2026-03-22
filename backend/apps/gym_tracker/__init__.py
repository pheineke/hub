from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import datetime
import models
from database import get_db
from auth import get_current_user

router = APIRouter()

class ActivityCreate(BaseModel):
    name: str

class ActivityResponse(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True
        from_attributes = True

class GymLogCreate(BaseModel):
    activity_id: int
    weight: float
    reps: int
    date: Optional[datetime.date] = None

class GymLogResponse(BaseModel):
    id: int
    activity_id: int
    weight: float
    reps: int
    date: datetime.date

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("/activities", response_model=List[ActivityResponse])
def get_activities(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.GymActivity).filter(models.GymActivity.user_id == current_user.id).all()

@router.post("/activities", response_model=ActivityResponse)
def create_activity(activity: ActivityCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_activity = models.GymActivity(user_id=current_user.id, name=activity.name)
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity

@router.delete("/activities/{activity_id}")
def delete_activity(activity_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    activity = db.query(models.GymActivity).filter(models.GymActivity.id == activity_id, models.GymActivity.user_id == current_user.id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Optional: Delete associated logs or set cascade delete in models. For now just delete logs manually.
    db.query(models.GymLog).filter(models.GymLog.activity_id == activity_id).delete()
    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted"}

@router.get("/logs", response_model=List[GymLogResponse])
def get_logs(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.GymLog).filter(models.GymLog.user_id == current_user.id).order_by(models.GymLog.date.desc(), models.GymLog.id.desc()).all()

@router.post("/logs", response_model=GymLogResponse)
def create_log(log: GymLogCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify activity belongs to user
    activity = db.query(models.GymActivity).filter(models.GymActivity.id == log.activity_id, models.GymActivity.user_id == current_user.id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    new_log = models.GymLog(
        user_id=current_user.id,
        activity_id=log.activity_id,
        weight=log.weight,
        reps=log.reps,
        date=log.date if log.date else datetime.date.today()
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@router.delete("/logs/{log_id}")
def delete_log(log_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    log = db.query(models.GymLog).filter(models.GymLog.id == log_id, models.GymLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"message": "Log deleted"}
