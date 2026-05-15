from pydantic import BaseModel, EmailStr, UUID4
from datetime import datetime
from typing import Optional


class LinkedInAccountCreate(BaseModel):
    label: str
    email: EmailStr
    password: str


class LinkedInAccountUpdate(BaseModel):
    label: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class LinkedInAccountOut(BaseModel):
    id: UUID4
    label: str
    email: str
    is_active: bool
    is_blocked: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
