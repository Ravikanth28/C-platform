from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("/", response_model=List[schemas.ProblemListResponse])
def list_problems(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Problem).order_by(models.Problem.created_at.desc()).all()


@router.get("/{problem_id}", response_model=schemas.ProblemResponse)
def get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Students only see sample test cases
    if current_user.role != "admin":
        problem.test_cases = [tc for tc in problem.test_cases if tc.is_sample]

    return problem


@router.post("/", response_model=schemas.ProblemResponse)
def create_problem(
    problem_data: schemas.ProblemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    problem = models.Problem(
        title=problem_data.title,
        description=problem_data.description,
        difficulty=problem_data.difficulty,
        tags=problem_data.tags,
        created_by=current_user.id,
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)
    return problem


@router.put("/{problem_id}", response_model=schemas.ProblemResponse)
def update_problem(
    problem_id: int,
    problem_data: schemas.ProblemUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    for field, value in problem_data.model_dump(exclude_none=True).items():
        setattr(problem, field, value)

    db.commit()
    db.refresh(problem)
    return problem


@router.delete("/{problem_id}")
def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    db.delete(problem)
    db.commit()
    return {"message": "Problem deleted"}


@router.post("/{problem_id}/testcases", response_model=schemas.TestCaseResponse)
def add_test_case(
    problem_id: int,
    tc_data: schemas.TestCaseCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    if not db.query(models.Problem).filter(models.Problem.id == problem_id).first():
        raise HTTPException(status_code=404, detail="Problem not found")

    tc = models.TestCase(
        problem_id=problem_id,
        input_data=tc_data.input_data,
        expected_output=tc_data.expected_output,
        is_sample=tc_data.is_sample,
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc


@router.delete("/{problem_id}/testcases/{tc_id}")
def delete_test_case(
    problem_id: int,
    tc_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    tc = db.query(models.TestCase).filter(
        models.TestCase.id == tc_id, models.TestCase.problem_id == problem_id
    ).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(tc)
    db.commit()
    return {"message": "Test case deleted"}
