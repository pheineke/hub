from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, Date, Float
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    preferences = Column(JSON, default={"theme": "default", "mode": "dark"})
    
    is_admin = Column(Boolean, default=False)
    requires_password_change = Column(Boolean, default=False)
    daily_download_limit_mb = Column(Integer, default=30000)
    downloaded_today_mb = Column(Integer, default=0)
    last_download_reset = Column(Date, default=datetime.date.today)

    installed_apps = relationship("UserApp", back_populates="user")

class UserApp(Base):
    __tablename__ = "user_apps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    app_id = Column(String, index=True)  # The string id corresponding to the modular app component
    preferences = Column(JSON, default={})

    user = relationship("User", back_populates="installed_apps")

class GymActivity(Base):
    __tablename__ = "gym_activities"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)

class GymLog(Base):
    __tablename__ = "gym_logs"
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("gym_activities.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=datetime.date.today)
    weight = Column(Float)
    reps = Column(Integer)
