from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import code_runner
import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


@router.post("/run", response_model=schemas.CodeRunResponse)
def run_code(
    req: schemas.CodeRunRequest,
    _: models.User = Depends(auth.get_current_user),
):
    """Run code with custom stdin — does not save a submission."""
    result = code_runner.run_code(req.code, req.language, req.stdin)
    return result


@router.post("/submit", response_model=schemas.SubmissionResponse)
def submit_code(
    req: schemas.CodeSubmitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Submit code — run against all hidden + sample test cases."""
    problem = db.query(models.Problem).filter(models.Problem.id == req.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    test_cases = (
        db.query(models.TestCase)
        .filter(models.TestCase.problem_id == req.problem_id)
        .all()
    )

    if not test_cases:
        result = code_runner.run_code(req.code, req.language)
        final_status = "accepted" if result["status"] == "success" else "runtime_error"
        output_text = result["output"] or result["error"]
    else:
        lines: List[str] = []
        final_status = "accepted"

        for tc in test_cases:
            result = code_runner.run_code(req.code, req.language, tc.input_data)

            if result["status"] == "tle":
                final_status = "time_limit"
                lines.append(f"Test #{tc.id}: ⏱ Time Limit Exceeded")
                break
            elif result["status"] == "error":
                final_status = "runtime_error"
                lines.append(f"Test #{tc.id}: 💥 Runtime Error\n{result['error']}")
                break
            else:
                actual = result["output"].strip()
                expected = tc.expected_output.strip()
                if actual == expected:
                    lines.append(f"Test #{tc.id}: ✓ Passed")
                else:
                    final_status = "wrong_answer"
                    lines.append(
                        f"Test #{tc.id}: ✗ Wrong Answer\n"
                        f"  Expected : {expected[:200]}\n"
                        f"  Got      : {actual[:200]}"
                    )

        output_text = "\n".join(lines)

    submission = models.Submission(
        user_id=current_user.id,
        problem_id=req.problem_id,
        code=req.code,
        language=req.language,
        status=final_status,
        output=output_text,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/", response_model=List[schemas.SubmissionResponse])
def my_submissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Submission)
        .filter(models.Submission.user_id == current_user.id)
        .order_by(models.Submission.created_at.desc())
        .all()
    )


@router.get("/{submission_id}", response_model=schemas.SubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return sub
