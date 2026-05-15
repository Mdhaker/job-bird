import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
import uuid

from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.queue.celery_app import celery_app
from app.core.config import get_settings
from app.core.security import decrypt

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_sync_db():
    """Get a synchronous DB session for use in Celery tasks."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()


@celery_app.task(bind=True, name="app.services.queue.tasks.run_scan_job", max_retries=2)
def run_scan_job(self: Task, scan_job_id: str) -> dict:
    """
    Main Celery task: scrape LinkedIn and evaluate results.
    Runs scraper (sync wrapper around async) then triggers AI scoring.
    """
    from app.models.scan_job import ScanJob, ScanStatus
    from app.models.job_post import JobPost, JobStatus
    from app.models.linkedin_account import LinkedInAccount
    from app.models.candidate_profile import CandidateProfile

    db = _get_sync_db()
    try:
        scan_job = db.query(ScanJob).filter(ScanJob.id == uuid.UUID(scan_job_id)).first()
        if not scan_job:
            logger.error("ScanJob %s not found", scan_job_id)
            return {"error": "ScanJob not found"}

        scan_job.status = ScanStatus.RUNNING
        scan_job.started_at = datetime.now(timezone.utc)
        scan_job.celery_task_id = self.request.id
        db.commit()

        account = None
        if scan_job.linkedin_account_id:
            account = db.query(LinkedInAccount).filter(
                LinkedInAccount.id == scan_job.linkedin_account_id
            ).first()

        if not account:
            scan_job.status = ScanStatus.FAILED
            scan_job.error_message = "No LinkedIn account configured"
            db.commit()
            return {"error": "No LinkedIn account"}

        email = account.email
        password = decrypt(account.encrypted_password)

        profile = None
        if scan_job.candidate_profile_id:
            profile = db.query(CandidateProfile).filter(
                CandidateProfile.id == scan_job.candidate_profile_id
            ).first()

        from app.services.scraper.linkedin_scraper import LinkedInScraper

        async def _scrape():
            scraper = LinkedInScraper(
                account_email=email,
                account_password=password,
                session_id=str(account.id),
            )
            jobs = []
            async for job_data in scraper.scrape(
                keywords=scan_job.keywords,
                location=scan_job.location,
                remote_filter=scan_job.remote_filter,
                experience_levels=scan_job.experience_level,
                job_types=scan_job.job_type,
                date_posted=scan_job.date_posted,
                max_results=scan_job.max_results,
            ):
                jobs.append(job_data)
            return jobs

        jobs = asyncio.run(_scrape())
        total_found = len(jobs)
        scan_job.total_found = total_found
        db.commit()

        # Persist job posts
        inserted_posts = []
        for j in jobs:
            existing = db.query(JobPost).filter(
                JobPost.scan_job_id == scan_job.id,
                JobPost.external_id == j.get("external_id", ""),
            ).first()
            if existing:
                continue

            post = JobPost(
                scan_job_id=scan_job.id,
                platform="linkedin",
                external_id=j.get("external_id", ""),
                url=j.get("url", ""),
                company_url=j.get("company_url"),
                title=j.get("title", ""),
                company=j.get("company", ""),
                location=j.get("location"),
                is_remote="remote" in (j.get("location") or "").lower(),
                job_type=j.get("job_type"),
                experience_level=j.get("experience_level"),
                salary_range=j.get("salary_range"),
                description=j.get("description"),
                skills_required=j.get("skills_required", []),
                is_easy_apply=j.get("is_easy_apply", False),
                posted_at=j.get("posted_at"),
                scraped_at=j.get("scraped_at", datetime.now(timezone.utc)),
                status=JobStatus.NEW,
            )
            db.add(post)
            inserted_posts.append(post)

        db.commit()

        # Trigger AI evaluation if profile configured
        if profile and inserted_posts:
            evaluate_job_posts.delay(
                scan_job_id=scan_job_id,
                profile_id=str(profile.id),
            )

        scan_job.status = ScanStatus.COMPLETED
        scan_job.completed_at = datetime.now(timezone.utc)
        db.commit()

        account.last_used_at = datetime.now(timezone.utc)
        db.commit()

        logger.info("ScanJob %s completed: %d jobs found", scan_job_id, total_found)
        return {"status": "completed", "total_found": total_found}

    except Exception as exc:
        logger.exception("ScanJob %s failed: %s", scan_job_id, exc)
        try:
            scan_job = db.query(ScanJob).filter(ScanJob.id == uuid.UUID(scan_job_id)).first()
            if scan_job:
                from app.models.scan_job import ScanStatus
                scan_job.status = ScanStatus.FAILED
                scan_job.error_message = str(exc)
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


@celery_app.task(bind=True, name="app.services.queue.tasks.evaluate_job_posts", max_retries=1)
def evaluate_job_posts(self: Task, scan_job_id: str, profile_id: str) -> dict:
    """AI scoring task: score all NEW job posts for a scan."""
    from app.models.job_post import JobPost, JobStatus
    from app.models.candidate_profile import CandidateProfile
    from app.models.scan_job import ScanJob
    from app.services.ai.scorer import AIScorer

    db = _get_sync_db()
    try:
        profile = db.query(CandidateProfile).filter(
            CandidateProfile.id == uuid.UUID(profile_id)
        ).first()
        if not profile:
            return {"error": "Profile not found"}

        posts = db.query(JobPost).filter(
            JobPost.scan_job_id == uuid.UUID(scan_job_id),
            JobPost.ai_score.is_(None),
        ).all()

        scorer = AIScorer()

        async def _evaluate_all():
            scored = 0
            matched = 0
            for post in posts:
                result = await scorer.score_job(
                    job_title=post.title,
                    company=post.company,
                    location=post.location,
                    description=post.description or "",
                    candidate_name=profile.name,
                    candidate_title=profile.title,
                    candidate_summary=profile.summary,
                    candidate_skills=profile.skills or [],
                    candidate_experience_years=profile.experience_years,
                    candidate_languages=profile.languages or [],
                    candidate_cv_text=profile.cv_text,
                )
                post.ai_score = result.score
                post.ai_summary = result.summary
                post.ai_strengths = result.strengths
                post.ai_gaps = result.gaps
                post.ai_evaluated_at = datetime.now(timezone.utc)
                post.status = (
                    JobStatus.MATCHED
                    if result.score >= settings.AI_SCORE_KEEP_THRESHOLD
                    else JobStatus.ARCHIVED
                )
                scored += 1
                if post.status == JobStatus.MATCHED:
                    matched += 1
                db.commit()
            return scored, matched

        scored, matched = asyncio.run(_evaluate_all())

        scan_job = db.query(ScanJob).filter(ScanJob.id == uuid.UUID(scan_job_id)).first()
        if scan_job:
            scan_job.total_scored = scored
            scan_job.total_matched = matched
            db.commit()

        logger.info("AI evaluation done for scan %s: %d scored, %d matched", scan_job_id, scored, matched)
        return {"scored": scored, "matched": matched}

    except Exception as exc:
        logger.exception("AI evaluation failed for scan %s: %s", scan_job_id, exc)
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
