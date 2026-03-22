import os
import re

auth_file = '/home/pi/hub/backend/auth.py'
with open(auth_file, 'r') as f:
    text = f.read()

text = text.replace('SECRET_KEY = "dummy-secret-key-for-now-in-production-use-env"', 'import os\nSECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-for-dev")')

with open(auth_file, 'w') as f:
    f.write(text)

main_file = '/home/pi/hub/backend/main.py'
with open(main_file, 'r') as f:
    text = f.read()

# Disable public registration since admin can make accounts now
reg_code = """@app.post("/register")
def register_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = auth.get_user(db, username=form_data.username)
    if user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(form_data.password)
    db_user = models.User(username=form_data.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User created successfully"}"""

reg_sec = """@app.post("/register")
def register_user():
    raise HTTPException(status_code=403, detail="Public registration is disabled. Please contact an administrator.")"""

text = text.replace(reg_code, reg_sec)

with open(main_file, 'w') as f:
    f.write(text)

print("Security fixed")
