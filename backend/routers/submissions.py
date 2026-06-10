"""Code submission + judging."""
import tempfile

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from code_runner import compile_code, judge_submission, run_once
from database import get_db

router = APIRouter()


class RunRequest(BaseModel):
    code: str
    custom_input: str = ""


@router.post("/run")
def run_code(
    payload: RunRequest,
    _user: models.User = Depends(get_current_user),
):
    """Compile and run code against custom input (no submission stored)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        exe, compile_error = compile_code(payload.code, tmpdir)
        if not exe:
            return {"status": "Compilation Error", "output": compile_error, "time_ms": 0}
        result = run_once(exe, payload.custom_input)
        return {
            "status": result["status"],
            "output": result["output"],
            "time_ms": result["time_ms"],
        }


@router.post("", status_code=201)
def submit_code(
    payload: schemas.SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    problem = db.query(models.Problem).filter(models.Problem.id == payload.problem_id).first()
    if not problem:
        raise HTTPException(404, "Problem not found")

    test_cases = [
        {
            "id": tc.id,
            "input_data": tc.input_data,
            "expected_output": tc.expected_output,
            "is_hidden": tc.is_hidden,
        }
        for tc in problem.test_cases
    ]

    verdict = judge_submission(payload.code, test_cases)

    sub = models.Submission(
        problem_id=payload.problem_id,
        user_id=current_user.id,
        code=payload.code,
        language=payload.language,
        status=verdict["status"],
        score=verdict["score"],
        time_taken=payload.time_taken,
        execution_time=verdict.get("execution_time"),
        tab_switches=payload.tab_switches or 0,
        test_cases_passed=verdict["passed"],
        test_cases_total=verdict["total"],
    )
    db.add(sub)
    db.flush()

    for r in verdict.get("results", []):
        db.add(
            models.SubmissionResult(
                submission_id=sub.id,
                test_case_id=r.get("test_case_id"),
                status=r["status"],
                actual_output=r.get("actual_output", ""),
                execution_time=r.get("execution_time"),
            )
        )

    db.commit()
    db.refresh(sub)

    return {
        "id": sub.id,
        "status": sub.status,
        "score": sub.score,
        "passed": verdict["passed"],
        "total": verdict["total"],
        "execution_time": sub.execution_time,
        "error": verdict.get("error", ""),
        "results": [
            {
                "test_case_id": r.get("test_case_id"),
                "status": r["status"],
                "actual_output": r.get("actual_output"),
                "execution_time": r.get("execution_time"),
                "is_hidden": r.get("is_hidden", False),
            }
            for r in verdict.get("results", [])
        ],
    }


@router.get("")
def list_submissions(
    problem_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Submission)
    if current_user.role != "admin":
        query = query.filter(models.Submission.user_id == current_user.id)
    if problem_id:
        query = query.filter(models.Submission.problem_id == problem_id)
    return [
        {
            "id": s.id,
            "problem_id": s.problem_id,
            "problem_title": s.problem.title if s.problem else None,
            "status": s.status,
            "score": s.score,
            "time_taken": s.time_taken,
            "test_cases_passed": s.test_cases_passed,
            "test_cases_total": s.test_cases_total,
            "submitted_at": s.submitted_at.isoformat() + ("" if s.submitted_at.tzinfo else "Z"),
        }
        for s in query.order_by(models.Submission.submitted_at.desc()).all()
    ]


@router.get("/{sub_id}")
def get_submission(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    s = db.query(models.Submission).filter(models.Submission.id == sub_id).first()
    if not s:
        raise HTTPException(404, "Submission not found")
    if current_user.role != "admin" and s.user_id != current_user.id:
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
        "id": s.id,
        "problem_id": s.problem_id,
        "problem_title": s.problem.title if s.problem else None,
        "mode": s.problem.mode.value if s.problem else None,
        "user_id": s.user_id,
        "username": s.user.username if s.user else None,
        "code": s.code,
        "status": s.status,
        "score": s.score,
        "time_taken": s.time_taken,
        "execution_time": s.execution_time,
        "tab_switches": s.tab_switches,
        "test_cases_passed": s.test_cases_passed,
        "test_cases_total": s.test_cases_total,
        "submitted_at": s.submitted_at.isoformat() + ("" if s.submitted_at.tzinfo else "Z"),
        "results": results,
    }
