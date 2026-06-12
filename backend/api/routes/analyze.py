"""
Analysis route:
  POST /analyze/  — run the full AI pipeline on submitted text

The endpoint works for both guests and authenticated users.
If a user is logged in their user_id is available for optional document saving.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.database import get_db
from db.models.user import User
from schemas.analyze import AnalyzeRequest, AnalyzeResponse
from api.deps import get_optional_user
from ai.pipeline import run_pipeline

router = APIRouter()


@router.post(
    "/",
    response_model=AnalyzeResponse,
    summary="Analyze text and return citation suggestions",
    description=(
        "Runs the full 9-step RAG pipeline: sentence parsing, claim detection, "
        "paper retrieval, embedding, semantic matching, scoring, LLM verification, "
        "and returns the top-3 verified references per detected claim."
    ),
)
async def analyze(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text cannot be empty.",
        )

    try:
        result = await run_pipeline(
            text=text,
            citation_style=payload.citation_style,
            db=db,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline error: {str(exc)}",
        )

    return AnalyzeResponse(
        sentences=result["sentences"],
        suggestions=result["suggestions"],
        citation_style=result["citation_style"],
        total_claims=result["total_claims"],
        total_refs_found=result["total_refs_found"],
    )
