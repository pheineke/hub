from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from fastapi.responses import FileResponse
import os
from .downloader import start_download_task, get_preview, DOWNLOAD_TASKS, LIBRARY_DIR
import sys
sys.path.append("/home/pi/hub/backend")
from auth import get_current_user
from models import User
from datetime import date
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter()

class DownloadRequest(BaseModel):
    url: str
    format: str = "mp3"
    resolution: str = "1080"
    limit: int = 0

class PreviewRequest(BaseModel):
    url: str

@router.post("/preview")
def preview(req: PreviewRequest, current_user: User = Depends(get_current_user)):
    res = get_preview(req.url)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/download")
def start_download(req: DownloadRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        if current_user.last_download_reset != date.today():
            current_user.downloaded_today_mb = 0
            current_user.last_download_reset = date.today()
            db.commit()
            
        # Estimating an average limit check (soft check here, hard check is on previous downloads)
        if current_user.downloaded_today_mb >= current_user.daily_download_limit_mb:
            raise HTTPException(status_code=403, detail=f"Daily download limit of {current_user.daily_download_limit_mb}MB exceeded.")
            
    task_id = start_download_task(req.dict(), user_id=current_user.id)
    return {"task_id": task_id}

@router.post("/cancel/{task_id}")
def cancel_down(task_id: str, current_user: User = Depends(get_current_user)):
    if task_id in DOWNLOAD_TASKS:
        DOWNLOAD_TASKS[task_id]["status"] = "cancelled"
        return {"status": "cancelled"}
    raise HTTPException(status_code=404, detail="Not found")

@router.get("/active")
def get_active(current_user: User = Depends(get_current_user)):
    active = {k: v for k, v in DOWNLOAD_TASKS.items() if v["status"] not in ["completed", "failed", "cancelled"]}
    return {"active": active}

@router.get("/zip/{task_id}")
def get_zip(task_id: str, current_user: User = Depends(get_current_user)):
    if task_id not in DOWNLOAD_TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    
    zip_path = DOWNLOAD_TASKS[task_id].get("zip_path")
    if not zip_path or not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="Zip file not ready or not found")
        
    return FileResponse(zip_path, media_type="application/zip", filename=f"media_bundle_{task_id[:8]}.zip")

@router.get("/status/{task_id}")
def check_status(task_id: str, current_user: User = Depends(get_current_user)):
    if task_id not in DOWNLOAD_TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    return DOWNLOAD_TASKS[task_id]
