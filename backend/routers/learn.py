"""
Learn hub — interactive lessons + quick beginner skill-builders.

  • GET  /learn/lessons          list lessons (curriculum)
  • GET  /learn/lessons/{id}     full lesson (concept / example / check blocks)
  • GET  /learn/challenges       list predict-output / fix-the-bug challenges
  • POST /learn/challenges/{id}/check   grade an attempt
  • admin CRUD under /learn/admin/{lessons,challenges}
"""
import json
import tempfile
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

import code_runner
import models
from auth import get_admin_user, get_current_user
from database import get_db

router = APIRouter()


# ─────────────────────────── lessons ───────────────────────────────────────

class LessonIn(BaseModel):
    title: str
    topic: Optional[str] = "basics"
    order_index: int = 0
    blocks: List[Any] = []          # [{type:'concept'|'example'|'check', ...}]
    is_active: bool = True


def _lesson_summary(l: models.Lesson) -> dict:
    try:
        blocks = json.loads(l.content or "[]")
    except Exception:
        blocks = []
    return {
        "id": l.id, "title": l.title, "topic": l.topic, "order_index": l.order_index,
        "is_active": l.is_active, "blocks_count": len(blocks),
    }


def _lesson_full(l: models.Lesson) -> dict:
    try:
        blocks = json.loads(l.content or "[]")
    except Exception:
        blocks = []
    return {**_lesson_summary(l), "blocks": blocks}


@router.get("/lessons")
def list_lessons(db: Session = Depends(get_db), _user: models.User = Depends(get_current_user)):
    items = (db.query(models.Lesson).filter(models.Lesson.is_active == True)
             .order_by(models.Lesson.order_index.asc(), models.Lesson.id.asc()).all())
    return [_lesson_summary(l) for l in items]


@router.get("/lessons/{lid}")
def get_lesson(lid: int, db: Session = Depends(get_db), _user: models.User = Depends(get_current_user)):
    l = db.query(models.Lesson).filter(models.Lesson.id == lid).first()
    if not l or not l.is_active:
        raise HTTPException(404, "Lesson not found")
    return _lesson_full(l)


@router.get("/my-progress")
def my_lesson_progress(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Lesson ids the current student has completed (drives the progress UI)."""
    rows = db.query(models.LessonCompletion.lesson_id).filter(
        models.LessonCompletion.user_id == user.id).all()
    return {"completed": [r[0] for r in rows]}


@router.post("/lessons/{lid}/complete")
def complete_lesson(lid: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    l = db.query(models.Lesson).filter(models.Lesson.id == lid).first()
    if not l:
        raise HTTPException(404, "Lesson not found")
    exists = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.lesson_id == lid,
        models.LessonCompletion.user_id == user.id).first()
    if not exists:
        db.add(models.LessonCompletion(lesson_id=lid, user_id=user.id))
        db.commit()
    return {"detail": "ok"}


@router.get("/admin/lessons")
def admin_list_lessons(db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    items = (db.query(models.Lesson)
             .order_by(models.Lesson.order_index.asc(), models.Lesson.id.asc()).all())
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    counts = dict(
        db.query(models.LessonCompletion.lesson_id, func.count(models.LessonCompletion.id))
        .group_by(models.LessonCompletion.lesson_id).all()
    )
    return [{**_lesson_full(l), "completed": int(counts.get(l.id, 0)), "total_students": total_students}
            for l in items]


@router.get("/admin/lessons/{lid}/progress")
def admin_lesson_progress(lid: int, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    """Per-student completion for one lesson — who's done it and who hasn't."""
    l = db.query(models.Lesson).filter(models.Lesson.id == lid).first()
    if not l:
        raise HTTPException(404, "Lesson not found")
    done = {uid: ts for uid, ts in db.query(
        models.LessonCompletion.user_id, models.LessonCompletion.completed_at
    ).filter(models.LessonCompletion.lesson_id == lid).all()}
    students = (db.query(models.User).filter(models.User.role == "student")
                .order_by(models.User.full_name).all())
    rows = [{
        "id": s.id, "name": s.full_name or s.username, "email": s.email,
        "avatar_color": s.avatar_color,
        "done": s.id in done,
        "completed_at": done[s.id].isoformat() if s.id in done and done[s.id] else None,
    } for s in students]
    return {"lesson": {"id": l.id, "title": l.title}, "completed": sum(1 for r in rows if r["done"]),
            "total": len(rows), "students": rows}


class GenerateLessonIn(BaseModel):
    title: str
    topic: Optional[str] = "basics"


@router.post("/admin/lessons/generate")
async def admin_generate_lesson(payload: GenerateLessonIn, _admin=Depends(get_admin_user)):
    """Use AI to draft a detailed lesson (blocks) for a topic. Admin reviews & saves."""
    import re as _re
    from ai_service import chat_completion

    system = ("You are an expert C programming curriculum author. "
              "Output ONLY a valid JSON array — no prose, no markdown code fences.")
    user = f"""Write a DETAILED, in-depth interactive lesson titled "{payload.title}" (topic: {payload.topic}) for the C language, taking a complete beginner all the way to an advanced understanding.

Return a JSON array of "blocks". Allowed block shapes:
- {{"type":"concept","body":"<rich Markdown, 350-700 words: use ## headings, **bold**, `inline code`, ```c fenced code blocks```, bullet lists and tables. Cover definition, syntax, how it works under the hood, worked examples, common mistakes, best practices.>"}}
- {{"type":"example","title":"<short>","code":"<a COMPLETE runnable C program>","stdin":"<optional input or empty>"}}
- {{"type":"check","mode":"mcq","question":"<q>","options":["a","b","c","d"],"answer":"<exact correct option text>","explanation":"<why>"}}
- {{"type":"check","mode":"output","question":"<q>","answer":"<exact expected stdout>","explanation":"<why>"}}
- {{"type":"reference","items":[{{"title":"<name>","url":"https://..."}}]}}

Rules:
- Produce 5-8 blocks total, ordered for learning (concepts first, an example, a check, end with one reference block of 2-3 real links e.g. cppreference.com, geeksforgeeks.org, learn-c.org).
- Make the concept blocks genuinely long and detailed — this is the main content.
- All C code and stdout must use proper JSON string escaping (\\n for newlines, \\" for quotes).
Output ONLY the JSON array, starting with [ and ending with ]."""

    raw = await chat_completion(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=6000, temperature=0.5,
    )
    txt = (raw or "").strip()
    txt = _re.sub(r"^```(?:json)?", "", txt).strip()
    txt = _re.sub(r"```$", "", txt).strip()
    s, e = txt.find("["), txt.rfind("]")
    if s == -1 or e == -1 or e <= s:
        raise HTTPException(502, "AI did not return JSON — try again.")
    try:
        blocks = json.loads(txt[s:e + 1])
    except Exception as ex:  # noqa: BLE001
        raise HTTPException(502, f"Could not parse AI output: {ex}")
    if not isinstance(blocks, list) or not blocks:
        raise HTTPException(502, "AI output was not a list of blocks.")
    return {"blocks": blocks}


@router.post("/admin/lessons", status_code=201)
def admin_create_lesson(payload: LessonIn, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    l = models.Lesson(title=payload.title, topic=payload.topic, order_index=payload.order_index,
                      content=json.dumps(payload.blocks), is_active=payload.is_active)
    db.add(l)
    db.commit()
    db.refresh(l)
    return _lesson_full(l)


@router.put("/admin/lessons/{lid}")
def admin_update_lesson(lid: int, payload: LessonIn, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    l = db.query(models.Lesson).filter(models.Lesson.id == lid).first()
    if not l:
        raise HTTPException(404, "Lesson not found")
    l.title = payload.title
    l.topic = payload.topic
    l.order_index = payload.order_index
    l.content = json.dumps(payload.blocks)
    l.is_active = payload.is_active
    db.commit()
    db.refresh(l)
    return _lesson_full(l)


@router.delete("/admin/lessons/{lid}")
def admin_delete_lesson(lid: int, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    l = db.query(models.Lesson).filter(models.Lesson.id == lid).first()
    if not l:
        raise HTTPException(404, "Lesson not found")
    db.delete(l)
    db.commit()
    return {"detail": "Deleted"}


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
