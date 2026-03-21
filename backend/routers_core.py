from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
from database import get_db
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/core", tags=["Core"])

class AppAction(BaseModel):
    app_id: str

@router.get("/installed", response_model=List[str])
def get_installed_apps(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_apps = db.query(models.UserApp).filter(models.UserApp.user_id == current_user.id).all()
    return [ua.app_id for ua in user_apps]

@router.post("/install")
def install_app(action: AppAction, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(models.UserApp).filter(
        models.UserApp.user_id == current_user.id, 
        models.UserApp.app_id == action.app_id
    ).first()
    
    if existing:
        return {"message": "Already installed"}
        
    new_app = models.UserApp(user_id=current_user.id, app_id=action.app_id)
    db.add(new_app)
    db.commit()
    return {"message": "Installed successfully"}

@router.post("/uninstall")
def uninstall_app(action: AppAction, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(models.UserApp).filter(
        models.UserApp.user_id == current_user.id, 
        models.UserApp.app_id == action.app_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Uninstalled"}
    return {"message": "App not found"}

@router.get("/apps/{app_id}/preferences")
def get_app_preferences(app_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_app = db.query(models.UserApp).filter(
        models.UserApp.user_id == current_user.id,
        models.UserApp.app_id == app_id
    ).first()
    if not user_app:
        return {}
    return user_app.preferences or {}

@router.put("/apps/{app_id}/preferences")
def update_app_preferences(app_id: str, prefs: dict, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_app = db.query(models.UserApp).filter(
        models.UserApp.user_id == current_user.id,
        models.UserApp.app_id == app_id
    ).first()
    if not user_app:
        raise HTTPException(status_code=404, detail="App not installed")
    
    user_app.preferences = prefs
    db.commit()
    return {"message": "Preferences updated"}
