import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, JSON, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class Platform(str, enum.Enum):
    LINKEDIN = "linkedin"
    INDEED = "indeed"


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Configuration
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    platform: Mapped[Platform] = mapped_column(SAEnum(Platform), default=Platform.LINKEDIN)
    status: Mapped[ScanStatus] = mapped_column(SAEnum(ScanStatus), default=ScanStatus.PENDING)

    # Search filters
    keywords: Mapped[str] = mapped_column(String(500), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    remote_filter: Mapped[str | None] = mapped_column(String(50), nullable=True)   # onsite/remote/hybrid
    experience_level: Mapped[list] = mapped_column(JSON, default=list)             # entry/mid/senior
    job_type: Mapped[list] = mapped_column(JSON, default=list)                     # full_time/part_time/contract
    date_posted: Mapped[str | None] = mapped_column(String(20), nullable=True)     # 24h/week/month
    max_results: Mapped[int] = mapped_column(Integer, default=100)

    # Relations
    linkedin_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("linkedin_accounts.id"), nullable=True)
    candidate_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=True)

    # Worker tracking
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_found: Mapped[int] = mapped_column(Integer, default=0)
    total_scored: Mapped[int] = mapped_column(Integer, default=0)
    total_matched: Mapped[int] = mapped_column(Integer, default=0)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    job_posts = relationship("JobPost", back_populates="scan_job", lazy="noload")
