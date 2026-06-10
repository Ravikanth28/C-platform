import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import monitoring
from database import Base, engine
from routers import (
    admin, ai_router, analytics, auth, classroom, notes, problems, reports, students, submissions,
)

monitoring.install_log_capture()

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── Create all tables ──────────────────────────────────────────────────────
try:
    Base.metadata.create_all(bind=engine)
except Exception as _db_exc:
    import logging
    logging.warning(f"DB create_all failed (configure DATABASE_URL in .env): {_db_exc}")


def _lightweight_migrate():
    """Add new columns to existing tables (no Alembic) + backfill invite codes."""
    import logging
    import secrets
    from sqlalchemy import text
    stmts = [
        "ALTER TABLE classes ADD COLUMN invite_code VARCHAR(12)",
        "ALTER TABLE submissions ADD COLUMN feedback TEXT",
    ]
    with engine.begin() as conn:
        for s in stmts:
            try:
                conn.execute(text(s))
            except Exception:
                pass  # column already exists
        try:
            rows = conn.execute(text("SELECT id FROM classes WHERE invite_code IS NULL OR invite_code=''")).fetchall()
            for (cid,) in rows:
                conn.execute(text("UPDATE classes SET invite_code=:c WHERE id=:i"),
                             {"c": secrets.token_hex(3).upper(), "i": cid})
        except Exception as e:
            logging.warning(f"invite-code backfill skipped: {e}")


try:
    _lightweight_migrate()
except Exception as _mig_exc:
    import logging
    logging.warning(f"lightweight migrate skipped: {_mig_exc}")

# ── Ensure upload directory exists ────────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "notes"), exist_ok=True)

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="C Programming Learning Platform",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    redirect_slashes=False,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static uploads ─────────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/api/auth",        tags=["Auth"])
app.include_router(admin.router,       prefix="/api/admin",       tags=["Admin"])
app.include_router(notes.router,       prefix="/api/notes",       tags=["Notes"])
app.include_router(problems.router,    prefix="/api/problems",    tags=["Problems"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(reports.router,     prefix="/api/reports",     tags=["Reports"])
app.include_router(students.router,    prefix="/api/students",    tags=["Students"])
app.include_router(ai_router.router,   prefix="/api/ai",          tags=["AI"])
app.include_router(classroom.router,   prefix="/api/classroom",   tags=["Classroom"])
app.include_router(analytics.router,   prefix="/api/analytics",   tags=["Analytics"])


@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}
