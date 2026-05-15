from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "jobbird",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.services.queue.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.services.queue.tasks.run_scan_job": {"queue": "scraper"},
        "app.services.queue.tasks.evaluate_job_posts": {"queue": "ai"},
    },
    task_soft_time_limit=3600,
    task_time_limit=4200,
)
