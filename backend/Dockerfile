# Backend image with the C toolchain the platform needs:
#   gcc  -> compile & run / judge submissions
#   gdb  -> step-by-step Code Visualizer trace
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        gdb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer caching)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# App code
COPY . .

ENV PYTHONUNBUFFERED=1

# Render injects $PORT; default to 8000 for local docker runs
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
