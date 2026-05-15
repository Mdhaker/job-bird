from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
import math

from app.core.database import get_db
from app.models.job_post import JobPost, JobStatus
from app.schemas.job_post import JobPostOut, JobPostListOut

router = APIRouter(prefix="/job-posts", tags=["Job Posts"])


@router.get("/", response_model=JobPostListOut)
async def list_job_posts(
    scan_job_id: uuid.UUID | None = Query(None),
    status: JobStatus | None = Query(None),
    min_score: float | None = Query(None),
    location: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(JobPost)
    count_query = select(func.count()).select_from(JobPost)

    filters = []
    if scan_job_id:
        filters.append(JobPost.scan_job_id == scan_job_id)
    if status:
        filters.append(JobPost.status == status)
    if min_score is not None:
        filters.append(JobPost.ai_score >= min_score)
    if location:
        filters.append(JobPost.location.ilike(f"%{location}%"))

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = query.order_by(JobPost.ai_score.desc().nullslast(), JobPost.scraped_at.desc())
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return JobPostListOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/{job_post_id}", response_model=JobPostOut)
async def get_job_post(job_post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobPost).where(JobPost.id == job_post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Job post not found")
    return post


@router.patch("/{job_post_id}/status", response_model=JobPostOut)
async def update_job_post_status(
    job_post_id: uuid.UUID,
    new_status: JobStatus,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobPost).where(JobPost.id == job_post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Job post not found")
    post.status = new_status
    await db.commit()
    await db.refresh(post)
    return post
