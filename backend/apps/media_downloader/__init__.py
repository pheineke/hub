from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse
import os
from .downloader import start_download_task, get_preview, DOWNLOAD_TASKS, LIBRARY_DIR

router = APIRouter()

class DownloadRequest(BaseModel):
    url: str
    format: str = "mp3"
    resolution: str = "1080"
    limit: int = 0

class PreviewRequest(BaseModel):
    url: str

@router.post("/preview")
def preview(req: PreviewRequest):
    res = get_preview(req.url)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/download")
def start_download(req: DownloadRequest):
    task_id = start_download_task(req.dict())
    return {"task_id": task_id}

@router.post("/cancel/{task_id}")
def cancel_down(task_id: str):
    if task_id in DOWNLOAD_TASKS:
        DOWNLOAD_TASKS[task_id]["status"] = "cancelled"
        return {"status": "cancelled"}
    raise HTTPException(status_code=404, detail="Not found")

@router.get("/active")
def get_active():
    active = {k: v for k, v in DOWNLOAD_TASKS.items() if v["status"] not in ["completed", "failed", "cancelled"]}
    return {"active": active}

@router.get("/zip/{task_id}")
def get_zip(task_id: str):
    if task_id not in DOWNLOAD_TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    
    zip_path = DOWNLOAD_TASKS[task_id].get("zip_path")
    if not zip_path or not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="Zip file not ready or not found")
        
    return FileResponse(zip_path, media_type="application/zip", filename=f"media_bundle_{task_id[:8]}.zip")

@router.get("/status/{task_id}")
def check_status(task_id: str):
    if task_id not in DOWNLOAD_TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    return DOWNLOAD_TASKS[task_id]

@router.get("/library")
def check_library():
    if not os.path.exists(LIBRARY_DIR):
        os.makedirs(LIBRARY_DIR)
        
    files = []
    for f in os.listdir(LIBRARY_DIR):
        if os.path.isfile(os.path.join(LIBRARY_DIR, f)):
            size_mb = round(os.path.getsize(os.path.join(LIBRARY_DIR, f)) / (1024 * 1024), 2)
            files.append({"name": f, "size_mb": size_mb})
            
    files = sorted(files, key=lambda x: x["name"])
    return {"files": files}
