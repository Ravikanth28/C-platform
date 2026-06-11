# Backend image with the C toolchain the platform needs:
#   gcc       -> compile & run / judge submissions
#   libc6-dev -> the C standard library headers (stdio.h, stdlib.h, math.h, …)
#   gdb       -> step-by-step Code Visualizer trace
# NOTE: with --no-install-recommends, gcc does NOT pull in libc6-dev, so it must
# be listed explicitly — otherwise compiles fail with "stdio.h: No such file".
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libc6-dev \
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
