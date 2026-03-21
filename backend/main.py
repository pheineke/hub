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
    return {"username": current_user.username, "id": current_user.id, "preferences": current_user.preferences or {}}


from pydantic import BaseModel
class PreferencesUpdate(BaseModel):
    theme: str
    mode: str

@app.put("/api/users/me/preferences")
def update_preferences(prefs: PreferencesUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    current_user.preferences = {"theme": prefs.theme, "mode": prefs.mode}
    db.commit()
    db.refresh(current_user)
    return current_user.preferences

from pydantic import Field
class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=4)

@app.put("/api/users/me/password")
def update_password(passwords: PasswordUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not auth.verify_password(passwords.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.hashed_password = auth.get_password_hash(passwords.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

# Registry Hook
from apps_registry import include_apps
from routers_core import router as core_router
app.include_router(core_router)
from apps_registry import include_apps
include_apps(app)
