from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional
from app.models.scan_job import ScanStatus, Platform


class ScanJobCreate(BaseModel):
    name: str
    platform: Platform = Platform.LINKEDIN
    keywords: str
    location: str
    remote_filter: Optional[str] = None
    experience_level: list[str] = []
    job_type: list[str] = []
    date_posted: Optional[str] = None
    max_results: int = 100
    linkedin_account_id: Optional[UUID4] = None
    candidate_profile_id: Optional[UUID4] = None


class ScanJobUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[ScanStatus] = None


class ScanJobOut(BaseModel):
    id: UUID4
    name: str
    platform: Platform
    status: ScanStatus
    keywords: str
    location: str
    remote_filter: Optional[str] = None
    experience_level: list[str]
    job_type: list[str]
    date_posted: Optional[str] = None
    max_results: int
    linkedin_account_id: Optional[UUID4] = None
    candidate_profile_id: Optional[UUID4] = None
    celery_task_id: Optional[str] = None
    error_message: Optional[str] = None
    total_found: int
    total_scored: int
    total_matched: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
