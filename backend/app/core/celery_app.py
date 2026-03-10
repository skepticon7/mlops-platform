from celery import Celery
from celery.signals import worker_process_init , worker_process_shutdown
import asyncio
from app.db.database import init_db , shutdown_db


celery_app = Celery(
    'mlops_studio',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1',
    include=['app.tasks.training_tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    task_track_started=True,
)


@worker_process_init.connect
def init_worker(**kwargs):
    """
        Called when a worker process is initialized.
        This runs once per worker process.
    """
    print("Initializing worker process...")
    asyncio.run(init_db())


@worker_process_shutdown.connect
def shutdown_worker(**kwargs):
    """
        Called when a worker process is shutdown.
    """
    print("Shutting down worker process...")
    asyncio.run(shutdown_db())
