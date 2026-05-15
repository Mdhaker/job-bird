from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import get_db
from app.models.scan_job import ScanJob, ScanStatus
from app.schemas.scan_job import ScanJobCreate, ScanJobUpdate, ScanJobOut
from app.services.queue.tasks import run_scan_job

router = APIRouter(prefix="/scan-jobs", tags=["Scan Jobs"])


@router.get("/", response_model=list[ScanJobOut])
async def list_scan_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).order_by(ScanJob.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ScanJobOut, status_code=status.HTTP_201_CREATED)
async def create_scan_job(payload: ScanJobCreate, db: AsyncSession = Depends(get_db)):
    scan_job = ScanJob(**payload.model_dump())
    db.add(scan_job)
    await db.commit()
    await db.refresh(scan_job)
    return scan_job


@router.get("/{scan_job_id}", response_model=ScanJobOut)
async def get_scan_job(scan_job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == scan_job_id))
    scan_job = result.scalar_one_or_none()
    if not scan_job:
        raise HTTPException(status_code=404, detail="Scan job not found")
    return scan_job


@router.post("/{scan_job_id}/start", response_model=ScanJobOut)
async def start_scan_job(scan_job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == scan_job_id))
    scan_job = result.scalar_one_or_none()
    if not scan_job:
        raise HTTPException(status_code=404, detail="Scan job not found")

    if scan_job.status == ScanStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Scan job is already running")

    if not scan_job.linkedin_account_id:
        raise HTTPException(status_code=400, detail="No LinkedIn account assigned to this scan job")

    task = run_scan_job.delay(str(scan_job_id))
    scan_job.status = ScanStatus.PENDING
    scan_job.celery_task_id = task.id
    scan_job.error_message = None
    await db.commit()
    await db.refresh(scan_job)
    return scan_job


@router.post("/{scan_job_id}/stop", response_model=ScanJobOut)
async def stop_scan_job(scan_job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == scan_job_id))
    scan_job = result.scalar_one_or_none()
    if not scan_job:
        raise HTTPException(status_code=404, detail="Scan job not found")

    if scan_job.celery_task_id:
        from app.services.queue.celery_app import celery_app
        celery_app.control.revoke(scan_job.celery_task_id, terminate=True)

    scan_job.status = ScanStatus.PAUSED
    await db.commit()
    await db.refresh(scan_job)
    return scan_job


@router.patch("/{scan_job_id}", response_model=ScanJobOut)
async def update_scan_job(scan_job_id: uuid.UUID, payload: ScanJobUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == scan_job_id))
    scan_job = result.scalar_one_or_none()
    if not scan_job:
        raise HTTPException(status_code=404, detail="Scan job not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(scan_job, field, value)

    await db.commit()
    await db.refresh(scan_job)
    return scan_job


@router.delete("/{scan_job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan_job(scan_job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == scan_job_id))
    scan_job = result.scalar_one_or_none()
    if not scan_job:
        raise HTTPException(status_code=404, detail="Scan job not found")
    await db.delete(scan_job)
    await db.commit()
