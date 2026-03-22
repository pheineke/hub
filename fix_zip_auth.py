with open("backend/apps/media_downloader/__init__.py", "r") as f:
    text = f.read()

old_func = """@router.get("/zip/{task_id}")
def get_zip(task_id: str, current_user: User = Depends(get_current_user)):"""

new_func = """@router.get("/zip/{task_id}")
def get_zip(task_id: str):"""

if old_func in text:
    text = text.replace(old_func, new_func)
    with open("backend/apps/media_downloader/__init__.py", "w") as f:
        f.write(text)
    print("Fixed backend auth")
else:
    print("Could not find the function definition block.")
