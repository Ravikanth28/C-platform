from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import auth
import models
from database import SessionLocal, engine

# Create DB tables
models.Base.metadata.create_all(bind=engine)


def _seed_admin() -> None:
    """Create a default admin account on first run."""
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.username == "admin").first():
            db.add(
                models.User(
                    username="admin",
                    email="admin@codeplatform.local",
                    password_hash=auth.get_password_hash("admin123"),
                    role="admin",
                )
            )
            db.commit()
            print("✓ Default admin seeded  (username: admin / password: admin123)")
    finally:
        db.close()


_seed_admin()

app = FastAPI(title="CodePlatform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.auth import router as auth_router
from routers.problems import router as problems_router
from routers.submissions import router as submissions_router

app.include_router(auth_router)
app.include_router(problems_router)
app.include_router(submissions_router)


@app.get("/")
def root():
    return {"message": "CodePlatform API is running", "docs": "/docs"}
