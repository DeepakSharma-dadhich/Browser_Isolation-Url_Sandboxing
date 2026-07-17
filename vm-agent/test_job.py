from pathlib import Path

from services.job_manager import JobManager

manager = JobManager()

jobs = manager.get_pending_jobs()

print(f"Pending jobs: {len(jobs)}")

if jobs:
    result = manager.process_job(jobs[0])
    print(result)
else:
    print("No pending jobs found.")