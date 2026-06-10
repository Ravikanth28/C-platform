"""Classes, assignments, and analytics — shared by admins and students."""
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth import get_admin_user, get_current_user
from database import get_db

router = APIRouter()


# ──────────────────────────── helpers ──────────────────────────────────────

def _iso(dt):
    if not dt:
        return None
    return dt.isoformat() + ("" if dt.tzinfo else "Z")


def _solved_problem_ids(db: Session, user_id: int) -> set:
    rows = (
        db.query(models.Submission.problem_id)
        .filter(models.Submission.user_id == user_id, models.Submission.status == "Accepted")
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def _class_dict(c: models.Class) -> dict:
    member_ids = [m.user_id for m in c.members]
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "member_ids": member_ids,
        "member_count": len(member_ids),
        "assignment_count": len(c.assignments),
        "created_at": _iso(c.created_at),
    }


def _assignment_admin_dict(db: Session, a: models.Assignment) -> dict:
    problem_ids = [ap.problem_id for ap in a.problems]
    member_ids = [m.user_id for m in a.klass.members] if a.klass else []
    total = len(problem_ids) * len(member_ids)
    done = 0
    if problem_ids and member_ids:
        rows = (
            db.query(models.Submission.user_id, models.Submission.problem_id)
            .filter(
                models.Submission.status == "Accepted",
                models.Submission.user_id.in_(member_ids),
                models.Submission.problem_id.in_(problem_ids),
            )
            .distinct()
            .all()
        )
        done = len({(u, p) for u, p in rows})
    return {
        "id": a.id,
        "title": a.title,
        "instructions": a.instructions,
        "class_id": a.class_id,
        "class_name": a.klass.name if a.klass else None,
        "due_date": _iso(a.due_date),
        "problem_ids": problem_ids,
        "problem_count": len(problem_ids),
        "member_count": len(member_ids),
        "completion_pct": round(done / total * 100, 1) if total else 0.0,
        "created_at": _iso(a.created_at),
    }


# ──────────────────────────── request bodies ───────────────────────────────

class ClassCreate(BaseModel):
    name: str
    description: Optional[str] = None
    member_ids: List[int] = []


class MembersUpdate(BaseModel):
    member_ids: List[int] = []


class AssignmentCreate(BaseModel):
    title: str
    instructions: Optional[str] = None
    class_id: int
    due_date: Optional[datetime.datetime] = None
    problem_ids: List[int] = []


# ──────────────────────────── pickers (admin) ──────────────────────────────

@router.get("/students")
def list_students(db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    users = (
        db.query(models.User)
        .filter(models.User.role == models.UserRole.student)
        .order_by(models.User.full_name)
        .all()
    )
    return [
        {
            "id": u.id,
            "full_name": u.full_name or u.username,
            "username": u.username,
            "email": u.email,
            "avatar_color": u.avatar_color,
        }
        for u in users
    ]


@router.get("/problems")
def list_all_problems(db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    rows = db.query(models.Problem).order_by(models.Problem.created_at.desc()).all()
    return [
        {"id": p.id, "title": p.title, "mode": p.mode.value, "difficulty": p.difficulty}
        for p in rows
    ]


# ──────────────────────────── classes (admin) ──────────────────────────────

@router.post("/classes", status_code=201)
def create_class(payload: ClassCreate, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    c = models.Class(name=payload.name, description=payload.description, created_by=admin.id)
    db.add(c)
    db.flush()
    for uid in set(payload.member_ids):
        db.add(models.ClassMember(class_id=c.id, user_id=uid))
    db.commit()
    db.refresh(c)
    return _class_dict(c)


@router.get("/classes")
def list_classes(db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    rows = db.query(models.Class).order_by(models.Class.created_at.desc()).all()
    return [_class_dict(c) for c in rows]


@router.put("/classes/{class_id}/members")
def set_members(class_id: int, payload: MembersUpdate, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    c = db.query(models.Class).filter(models.Class.id == class_id).first()
    if not c:
        raise HTTPException(404, "Class not found")
    db.query(models.ClassMember).filter(models.ClassMember.class_id == class_id).delete()
    for uid in set(payload.member_ids):
        db.add(models.ClassMember(class_id=class_id, user_id=uid))
    db.commit()
    db.refresh(c)
    return _class_dict(c)


@router.delete("/classes/{class_id}", status_code=204)
def delete_class(class_id: int, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    c = db.query(models.Class).filter(models.Class.id == class_id).first()
    if not c:
        raise HTTPException(404, "Class not found")
    db.delete(c)
    db.commit()


@router.post("/seed-demo")
def seed_demo(db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    """One-click: create a sample class (all students) + 2 assignments. No-op if classes exist."""
    if db.query(models.Class).count() > 0:
        return {"created": False, "message": "Classes already exist"}
    students = db.query(models.User).filter(models.User.role == models.UserRole.student).all()
    klass = models.Class(name="C Programming 101", description="Intro cohort", created_by=admin.id)
    db.add(klass)
    db.flush()
    for s in students:
        db.add(models.ClassMember(class_id=klass.id, user_id=s.id))

    practice = (
        db.query(models.Problem)
        .filter(models.Problem.mode == models.ProblemMode.practice)
        .order_by(models.Problem.id)
        .all()
    )
    now = datetime.datetime.utcnow()
    made = 0
    if practice:
        a1 = models.Assignment(
            title="Week 1 — Basics", instructions="Warm up with output and arithmetic.",
            class_id=klass.id, due_date=now + datetime.timedelta(days=7), created_by=admin.id,
        )
        db.add(a1)
        db.flush()
        for p in practice[:2]:
            db.add(models.AssignmentProblem(assignment_id=a1.id, problem_id=p.id))
        made += 1
        if len(practice) > 2:
            a2 = models.Assignment(
                title="Week 2 — Loops & Strings", instructions="Factorial and string reversal.",
                class_id=klass.id, due_date=now + datetime.timedelta(days=14), created_by=admin.id,
            )
            db.add(a2)
            db.flush()
            for p in practice[2:4]:
                db.add(models.AssignmentProblem(assignment_id=a2.id, problem_id=p.id))
            made += 1
    db.commit()
    return {"created": True, "assignments": made, "students": len(students)}


# ──────────────────────────── assignments (admin) ──────────────────────────

@router.post("/assignments", status_code=201)
def create_assignment(payload: AssignmentCreate, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    if not db.query(models.Class).filter(models.Class.id == payload.class_id).first():
        raise HTTPException(404, "Class not found")
    a = models.Assignment(
        title=payload.title,
        instructions=payload.instructions,
        class_id=payload.class_id,
        due_date=payload.due_date,
        created_by=admin.id,
    )
    db.add(a)
    db.flush()
    for pid in payload.problem_ids:
        db.add(models.AssignmentProblem(assignment_id=a.id, problem_id=pid))
    db.commit()
    db.refresh(a)
    return _assignment_admin_dict(db, a)


@router.get("/assignments")
def list_assignments(db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    rows = db.query(models.Assignment).order_by(models.Assignment.created_at.desc()).all()
    return [_assignment_admin_dict(db, a) for a in rows]


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    db.delete(a)
    db.commit()


# ──────────────────────────── student view ─────────────────────────────────

@router.get("/my-assignments")
def my_assignments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    class_ids = [
        m.class_id for m in db.query(models.ClassMember).filter(models.ClassMember.user_id == user.id).all()
    ]
    if not class_ids:
        return []
    solved = _solved_problem_ids(db, user.id)
    out = []
    rows = (
        db.query(models.Assignment)
        .filter(models.Assignment.class_id.in_(class_ids))
        .order_by(models.Assignment.due_date.is_(None), models.Assignment.due_date.asc())
        .all()
    )
    for a in rows:
        problems = []
        for ap in a.problems:
            p = ap.problem
            if not p:
                continue
            problems.append({
                "id": p.id,
                "title": p.title,
                "difficulty": p.difficulty,
                "mode": p.mode.value,
                "solved": p.id in solved,
            })
        solved_count = sum(1 for pr in problems if pr["solved"])
        out.append({
            "id": a.id,
            "title": a.title,
            "instructions": a.instructions,
            "class_name": a.klass.name if a.klass else None,
            "due_date": _iso(a.due_date),
            "problems": problems,
            "total": len(problems),
            "solved": solved_count,
        })
    return out


# ──────────────────────────── analytics ────────────────────────────────────

@router.get("/analytics/admin")
def analytics_admin(db: Session = Depends(get_db), _admin=Depends(get_admin_user)):
    total_students = db.query(models.User).filter(models.User.role == models.UserRole.student).count()
    total_subs = db.query(models.Submission).count()
    accepted = db.query(models.Submission).filter(models.Submission.status == "Accepted").count()

    per_problem = []
    for p in db.query(models.Problem).all():
        attempts = db.query(models.Submission).filter(models.Submission.problem_id == p.id).count()
        acc = db.query(models.Submission).filter(
            models.Submission.problem_id == p.id, models.Submission.status == "Accepted"
        ).count()
        avg = db.query(func.avg(models.Submission.score)).filter(
            models.Submission.problem_id == p.id
        ).scalar() or 0
        per_problem.append({
            "id": p.id,
            "title": p.title,
            "mode": p.mode.value,
            "attempts": attempts,
            "accepted": acc,
            "acceptance": round(acc / attempts * 100, 1) if attempts else 0.0,
            "avg_score": round(float(avg), 1),
        })
    per_problem.sort(key=lambda x: x["attempts"], reverse=True)

    return {
        "stats": {
            "students": total_students,
            "submissions": total_subs,
            "accepted": accepted,
            "acceptance": round(accepted / total_subs * 100, 1) if total_subs else 0.0,
            "problems": db.query(models.Problem).count(),
            "classes": db.query(models.Class).count(),
        },
        "per_problem": per_problem[:50],
    }


@router.get("/analytics/student")
def analytics_student(db: Session = Depends(get_db), user=Depends(get_current_user)):
    subs = db.query(models.Submission).filter(models.Submission.user_id == user.id)
    total = subs.count()
    accepted = subs.filter(models.Submission.status == "Accepted").count()
    avg = db.query(func.avg(models.Submission.score)).filter(
        models.Submission.user_id == user.id
    ).scalar() or 0
    solved = _solved_problem_ids(db, user.id)
    attempted = {r[0] for r in subs.with_entities(models.Submission.problem_id).distinct().all()}

    status_rows = (
        db.query(models.Submission.status, func.count(models.Submission.id))
        .filter(models.Submission.user_id == user.id)
        .group_by(models.Submission.status)
        .all()
    )
    by_status = [{"name": s, "value": c} for s, c in status_rows]

    diff = {}
    if attempted:
        for p in db.query(models.Problem).filter(models.Problem.id.in_(attempted)).all():
            d = (p.difficulty or "medium").capitalize()
            diff.setdefault(d, {"difficulty": d, "attempted": 0, "solved": 0})
            diff[d]["attempted"] += 1
            if p.id in solved:
                diff[d]["solved"] += 1

    return {
        "stats": {
            "submissions": total,
            "accepted": accepted,
            "avg_score": round(float(avg), 1),
            "attempted": len(attempted),
            "solved": len(solved),
        },
        "by_status": by_status,
        "by_difficulty": list(diff.values()),
    }
