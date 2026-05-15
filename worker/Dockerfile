FROM python:3.12-slim

WORKDIR /app

# Install system deps for Playwright Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl wget gnupg \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libdrm2 \
    libpango-1.0-0 libcairo2 libasound2 libx11-6 libxext6 libxrender1 \
    fonts-liberation libappindicator3-1 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Build context is repo root — copy backend sources
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium browser binaries
RUN playwright install chromium && playwright install-deps chromium

COPY backend/ .

RUN mkdir -p /tmp/jobbird_sessions

CMD ["celery", "-A", "app.services.queue.celery_app.celery_app", "worker", \
     "--loglevel=info", "--queues=scraper,ai", "--concurrency=2"]
