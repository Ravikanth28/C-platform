from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ── Problems ─────────────────────────────────────────────────────────────────

class TestCaseCreate(BaseModel):
    input_data: str = ""
    expected_output: str
    is_sample: bool = False


class TestCaseResponse(BaseModel):
    id: int
    input_data: str
    expected_output: str
    is_sample: bool

    model_config = {"from_attributes": True}


class ProblemCreate(BaseModel):
    title: str
    description: str
    difficulty: str = "easy"
    tags: str = ""


class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[str] = None


class ProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    tags: str
    created_by: Optional[int]
    created_at: datetime
    test_cases: List[TestCaseResponse] = []

    model_config = {"from_attributes": True}


class ProblemListResponse(BaseModel):
    id: int
    title: str
    difficulty: str
    tags: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Submissions ───────────────────────────────────────────────────────────────

class CodeRunRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


class CodeSubmitRequest(BaseModel):
    problem_id: int
    code: str
    language: str


class SubmissionResponse(BaseModel):
    id: int
    problem_id: int
    language: str
    status: str
    output: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CodeRunResponse(BaseModel):
    output: str
    error: str
    status: str
