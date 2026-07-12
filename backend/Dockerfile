# ==========================================
# FastAPI Backend Production-Ready Dockerfile
# ==========================================
FROM python:3.11-slim

# Prevent python from writing pyc files to disk and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (especially useful for database drivers or encryption engines)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install playwright chromium browser and system dependencies
RUN playwright install chromium --with-deps

# Copy backend application files
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
