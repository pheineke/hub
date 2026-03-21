from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    installed_apps = relationship("UserApp", back_populates="user")

class UserApp(Base):
    __tablename__ = "user_apps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    app_id = Column(String, index=True)  # The string id corresponding to the modular app component
    preferences = Column(JSON, default={})

    user = relationship("User", back_populates="installed_apps")
