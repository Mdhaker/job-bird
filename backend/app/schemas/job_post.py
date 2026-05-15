from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional
from app.models.job_post import JobStatus


class JobPostOut(BaseModel):
    id: UUID4
    scan_job_id: UUID4
    platform: str
    external_id: str
    url: str
    company_url: Optional[str] = None
    title: str
    company: str
    location: Optional[str] = None
    is_remote: bool
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None
    skills_required: list[str]
    is_easy_apply: bool
    posted_at: Optional[datetime] = None
    ai_score: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_strengths: list[str]
    ai_gaps: list[str]
    ai_evaluated_at: Optional[datetime] = None
    status: JobStatus
    scraped_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class JobPostListOut(BaseModel):
    items: list[JobPostOut]
    total: int
    page: int
    page_size: int
    total_pages: int
