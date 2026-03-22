import re
with open("backend/apps/media_downloader/__init__.py", "r") as f:
    text = f.read()

# Add title to schema
old_req = """class DownloadRequest(BaseModel):
    url: str
    format: str = "mp3"
    resolution: str = "1080"
    limit: int = 0"""
new_req = """class DownloadRequest(BaseModel):
    url: str
    format: str = "mp3"
    resolution: str = "1080"
    limit: int = 0
    title: Optional[str] = None"""

text = text.replace(old_req, new_req)

# Use title in filename instead of task_id
old_zip = """    return FileResponse(zip_path, media_type="application/zip", filename=f"media_bundle_{task_id[:8]}.zip")"""
new_zip = """    title = DOWNLOAD_TASKS[task_id].get("title") or "media_bundle"
    import re as regex
    safe_title = regex.sub(r'[^a-zA-Z0-9_\- ]', '', title).strip().replace(' ', '_')
    if not safe_title: safe_title = "media_bundle"
    return FileResponse(zip_path, media_type="application/zip", filename=f"{safe_title}_{task_id[:6]}.zip")"""

text = text.replace(old_zip, new_zip)

with open("backend/apps/media_downloader/__init__.py", "w") as f:
    f.write(text)
print("done")
