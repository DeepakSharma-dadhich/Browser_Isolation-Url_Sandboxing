FROM mcr.microsoft.com/playwright/python:v1.50.0-noble

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV SANDBOX_BROWSER_CHANNEL=""

# Install any additional python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy sandbox agent source code
COPY . /app/

# Remove host specific artifacts from copy if present
RUN rm -rf /app/venv /app/.venv /app/shared/input/* /app/shared/processing/* /app/shared/completed/* /app/shared/failed/*

CMD ["python", "worker.py"]
