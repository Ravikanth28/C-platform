"""AI problem generation via Cerebras."""
from fastapi import APIRouter, Depends, HTTPException

import schemas
from ai_service import generate_c_problem
from auth import get_admin_user

router = APIRouter()


@router.post("/generate-problem")
async def generate_problem(
    payload: schemas.AIGenerateRequest,
    _admin=Depends(get_admin_user),
):
    try:
        result = await generate_c_problem(
            topic=payload.topic,
            difficulty=payload.difficulty,
            extra=payload.description,
        )
        return result
    except Exception as exc:
        raise HTTPException(502, f"AI generation failed: {exc}")
