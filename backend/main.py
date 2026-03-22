from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

import models, database, auth

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev; bind correctly in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = auth.get_user(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register")
def register_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = auth.get_user(db, username=form_data.username)
    if user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(form_data.password)
    db_user = models.User(username=form_data.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User created successfully"}

@app.get("/me")
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "username": current_user.username, 
        "id": current_user.id, 
        "preferences": current_user.preferences or {},
        "is_admin": current_user.is_admin,
        "requires_password_change": current_user.requires_password_change,
        "daily_download_limit_mb": current_user.daily_download_limit_mb,
        "downloaded_today_mb": current_user.downloaded_today_mb
    }


from pydantic import BaseModel
from typing import Optional, List

class PreferencesUpdate(BaseModel):
    theme: str
    mode: str
    avatar: Optional[str] = None
    dashboardOrder: Optional[List[str]] = None

@app.put("/api/users/me/preferences")
def update_preferences(prefs: PreferencesUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    updated_prefs = {"theme": prefs.theme, "mode": prefs.mode}
    if prefs.avatar is not None:
        updated_prefs["avatar"] = prefs.avatar
    if prefs.dashboardOrder is not None:
        updated_prefs["dashboardOrder"] = prefs.dashboardOrder
        
    current_user.preferences = updated_prefs
    db.commit()
    db.refresh(current_user)
    return current_user.preferences


from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
import os
import shutil
import uuid

# Create static dir if it doesn't exist
os.makedirs("static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/api/users/me/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    filepath = f"static/avatars/{filename}"
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    avatar_url = f"/static/avatars/{filename}"
    
    # Update user preferences
    prefs = current_user.preferences or {"theme": "default", "mode": "dark"}
    prefs["avatar"] = avatar_url
    
    # SQLAlchemy requires this for JSON column updates sometimes
    current_user.preferences = dict(prefs)
    db.commit()
    
    return {"avatar": avatar_url}

from pydantic import Field
class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=4)

@app.put("/api/users/me/password")
def update_password(passwords: PasswordUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not auth.verify_password(passwords.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.hashed_password = auth.get_password_hash(passwords.new_password)
    current_user.requires_password_change = False
    db.commit()
    return {"message": "Password updated successfully"}


# --- Admin Routes ---
class AdminUserCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False
    daily_download_limit_mb: int = 30000

class AdminUserLimitUpdate(BaseModel):
    daily_download_limit_mb: int

@app.get("/api/admin/users")
def get_all_users(current_admin: models.User = Depends(auth.get_admin_user), db: Session = Depends(database.get_db)):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "is_admin": u.is_admin,
            "requires_password_change": u.requires_password_change,
            "daily_download_limit_mb": u.daily_download_limit_mb,
            "downloaded_today_mb": u.downloaded_today_mb
        } for u in users
    ]

@app.post("/api/admin/users")
def admin_create_user(user_data: AdminUserCreate, current_admin: models.User = Depends(auth.get_admin_user), db: Session = Depends(database.get_db)):
    existing = auth.get_user(db, username=user_data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        username=user_data.username,
        hashed_password=hashed_password,
        is_admin=user_data.is_admin,
        requires_password_change=True,
        daily_download_limit_mb=user_data.daily_download_limit_mb
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "id": new_user.id}

@app.put("/api/admin/users/{user_id}/limit")
def admin_update_user_limit(user_id: int, limit_data: AdminUserLimitUpdate, current_admin: models.User = Depends(auth.get_admin_user), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.daily_download_limit_mb = limit_data.daily_download_limit_mb
    db.commit()
    return {"message": "Limit updated successfully"}
# --------------------

# Registry Hook
from apps_registry import include_apps
from routers_core import router as core_router
app.include_router(core_router)
from apps_registry import include_apps
include_apps(app)
