import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import admin, ai_router, auth, notes, problems, reports, students, submissions

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── Create all tables ──────────────────────────────────────────────────────
try:
    Base.metadata.create_all(bind=engine)
except Exception as _db_exc:
    import logging
    logging.warning(f"DB create_all failed (configure DATABASE_URL in .env): {_db_exc}")

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
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://127.0.0.1:5173", "http://localhost:5173"],
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


@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}
