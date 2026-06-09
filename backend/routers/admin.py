"""Admin-only dashboard and user management."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_admin_user
from database import get_db

router = APIRouter()


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    total_admins = db.query(models.User).filter(models.User.role == "admin").count()
    total_notes = db.query(models.Note).filter(models.Note.is_deleted == False).count()
    total_practice = (
        db.query(models.Problem)
        .filter(models.Problem.mode == "practice", models.Problem.is_active == True)
        .count()
    )
    total_tests = (
        db.query(models.Problem)
        .filter(models.Problem.mode == "test", models.Problem.is_active == True)
        .count()
    )
    total_submissions = db.query(models.Submission).count()

    # Accepted / Wrong / Other breakdown
    accepted = (
        db.query(models.Submission)
        .filter(models.Submission.status == "Accepted")
        .count()
    )

    # Recent 5 submissions
    recent = (
        db.query(models.Submission)
        .order_by(models.Submission.submitted_at.desc())
        .limit(5)
        .all()
    )
    recent_data = []
    for s in recent:
        recent_data.append(
            {
                "id": s.id,
                "student": s.user.username if s.user else "—",
                "problem": s.problem.title if s.problem else "—",
                "status": s.status,
                "submitted_at": s.submitted_at.isoformat(),
            }
        )

    # Students list for quick reference
    students = (
        db.query(models.User)
        .filter(models.User.role == "student")
        .order_by(models.User.created_at.desc())
        .all()
    )

    return {
        "stats": {
            "total_students": total_students,
            "total_admins": total_admins,
            "total_notes": total_notes,
            "total_practice": total_practice,
            "total_tests": total_tests,
            "total_submissions": total_submissions,
            "accepted_submissions": accepted,
        },
        "recent_submissions": recent_data,
        "students": [
            {
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "email": u.email,
                "avatar_color": u.avatar_color,
                "created_at": u.created_at.isoformat(),
            }
            for u in students
        ],
    }


@router.get("/students", response_model=List[schemas.UserResponse])
def list_students(
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return (
        db.query(models.User)
        .filter(models.User.role == "student")
        .order_by(models.User.created_at.desc())
        .all()
    )


@router.delete("/students/{user_id}")
def delete_student(
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"detail": "Deleted"}
