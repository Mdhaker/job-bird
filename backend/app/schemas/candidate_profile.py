from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional


class CandidateProfileCreate(BaseModel):
    name: str
    title: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = []
    experience_years: Optional[int] = None
    languages: list[str] = []
    cv_text: Optional[str] = None
    cv_filename: Optional[str] = None


class CandidateProfileUpdate(CandidateProfileCreate):
    name: Optional[str] = None


class CandidateProfileOut(BaseModel):
    id: UUID4
    name: str
    title: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str]
    experience_years: Optional[int] = None
    languages: list[str]
    cv_filename: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
