"""
Learn hub — quick beginner skill-builders.

  • GET  /learn/challenges       list predict-output / fix-the-bug challenges
  • POST /learn/challenges/{id}/check   grade an attempt
  • admin CRUD under /learn/admin/challenges
"""
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import code_runner
import models
from auth import get_admin_user, get_current_user
from database import get_db

router = APIRouter()


# ─────────────────────────── challenges ────────────────────────────────────

class ChallengeIn(BaseModel):
    kind: str                      # predict | fixbug
    title: str
    topic: Optional[str] = "basics"
    difficulty: str = "easy"
    snippet: str
    test_input: Optional[str] = ""
    expected_output: Optional[str] = ""
    explanation: Optional[str] = ""
    is_active: bool = True


class AttemptIn(BaseModel):
    answer: Optional[str] = None   # predict: typed output
    code: Optional[str] = None     # fixbug: edited code


def _challenge_public(c: models.Challenge) -> dict:
    """Student-facing view — never leaks the expected output / explanation."""
    return {
        "id": c.id, "kind": c.kind, "title": c.title, "topic": c.topic,
        "difficulty": c.difficulty, "snippet": c.snippet,
        "test_input": c.test_input or "",
    }


def _challenge_full(c: models.Challenge) -> dict:
    return {**_challenge_public(c),
            "expected_output": c.expected_output or "",
            "explanation": c.explanation or "", "is_active": c.is_active,
            "created_at": c.created_at.isoformat()}


@router.get("/challenges")
def list_challenges(kind: Optional[str] = None, db: Session = Depends(get_db),
                    _user: models.User = Depends(get_current_user)):
    q = db.query(models.Challenge).filter(models.Challenge.is_active == True)
    if kind:
        q = q.filter(models.Challenge.kind == kind)
    items = q.order_by(models.Challenge.id.asc()).all()
    return [_challenge_public(c) for c in items]


@router.post("/challenges/{cid}/check")
def check_challenge(cid: int, attempt: AttemptIn, db: Session = Depends(get_db),
                    _user: models.User = Depends(get_current_user)):
    c = db.query(models.Challenge).filter(models.Challenge.id == cid).first()
    if not c:
        raise HTTPException(404, "Challenge not found")

    expected = code_runner._normalize(c.expected_output or "")

    if c.kind == "predict":
        guess = code_runner._normalize(attempt.answer or "")
        correct = guess == expected
        return {"correct": correct, "expected_output": c.expected_output or "",
                "explanation": c.explanation or ""}

    # fixbug: compile + run the student's edited code against test_input
    code = attempt.code or ""
    with tempfile.TemporaryDirectory() as tmp:
        exe, cerr = code_runner.compile_code(code, tmp)
        if not exe:
            return {"correct": False, "status": "Compilation Error",
                    "output": "", "error": cerr, "expected_output": c.expected_output or "",
                    "explanation": ""}
        run = code_runner.run_once(exe, c.test_input or "", time_limit=5.0)
    actual = run["output"] if run["status"] == "ok" else ""
    correct = run["status"] == "ok" and actual == expected
    return {
        "correct": correct,
        "status": run["status"],
        "output": run["output"],
        "error": "" if run["status"] == "ok" else run["output"],
        "expected_output": c.expected_output or "",
        "explanation": c.explanation or "" if correct else "",
    }


# ─────────────────────────── admin CRUD ────────────────────────────────────

@router.get("/admin/challenges")
def admin_list_challenges(db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    items = db.query(models.Challenge).order_by(models.Challenge.id.desc()).all()
    return [_challenge_full(c) for c in items]


@router.post("/admin/challenges", status_code=201)
def admin_create_challenge(payload: ChallengeIn, db: Session = Depends(get_db),
                           _admin=Depends(get_admin_user)):
    if payload.kind not in ("predict", "fixbug"):
        raise HTTPException(400, "kind must be 'predict' or 'fixbug'")
    c = models.Challenge(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _challenge_full(c)


@router.put("/admin/challenges/{cid}")
def admin_update_challenge(cid: int, payload: ChallengeIn, db: Session = Depends(get_db),
                           _admin=Depends(get_admin_user)):
    c = db.query(models.Challenge).filter(models.Challenge.id == cid).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _challenge_full(c)


@router.delete("/admin/challenges/{cid}")
def admin_delete_challenge(cid: int, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    c = db.query(models.Challenge).filter(models.Challenge.id == cid).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    db.delete(c)
    db.commit()
    return {"detail": "Deleted"}
