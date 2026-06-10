"""Reports: aggregated submission data for admin and per-student."""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter()


def _row(s: models.Submission) -> dict:
    return {
        "submission_id": s.id,
        "student_name": s.user.full_name or s.user.username if s.user else "—",
        "student_username": s.user.username if s.user else "—",
        "student_email": s.user.email if s.user else "—",
        "problem_title": s.problem.title if s.problem else "—",
        "mode": s.problem.mode.value if s.problem else "—",
        "status": s.status,
        "score": s.score,
        "time_taken": s.time_taken,
        "tab_switches": s.tab_switches,
        "test_cases_passed": s.test_cases_passed,
        "test_cases_total": s.test_cases_total,
        "submitted_at": s.submitted_at.isoformat() + ("" if s.submitted_at.tzinfo else "Z"),
    }


@router.get("")
def get_reports(
    mode: Optional[str] = None,      # practice | test
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Submission).join(models.Problem)

    # Students only see their own reports
    if current_user.role != "admin":
        query = query.filter(models.Submission.user_id == current_user.id)
    elif student_id:
        query = query.filter(models.Submission.user_id == student_id)

    if mode:
        query = query.filter(models.Problem.mode == mode)

    subs = query.order_by(models.Submission.submitted_at.desc()).all()
    return [_row(s) for s in subs]


@router.get("/{submission_id}")
def get_report_detail(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    s = (
        db.query(models.Submission)
        .filter(models.Submission.id == submission_id)
        .first()
    )
    if not s:
        from fastapi import HTTPException
        raise HTTPException(404, "Not found")
    if current_user.role != "admin" and s.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(403, "Forbidden")

    results = [
        {
            "test_case_id": r.test_case_id,
            "status": r.status,
            "actual_output": r.actual_output,
            "execution_time": r.execution_time,
        }
        for r in s.results
    ]

    return {
        **_row(s),
        "code": s.code,
        "results": results,
    }
