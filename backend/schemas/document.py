from pydantic import BaseModel, Field
from typing import Literal, Any
from uuid import UUID
from datetime import datetime


# ── Decision map type ─────────────────────────────────────────────────────────
# Keys are sentence IDs (as strings), values are {refIndex: int, status: str}
DecisionMap = dict[str, dict[str, Any]]


# ── Create ────────────────────────────────────────────────────────────────────

class DocumentCreateRequest(BaseModel):
    title: str = Field("Untitled Document", max_length=500)
    raw_text: str = Field(..., min_length=1)
    pipeline_result: dict[str, Any] | None = Field(
        None,
        description="Full AnalyzeResponse payload to store so it can be reloaded.",
    )
    decisions: DecisionMap = Field(
        default_factory=dict,
        description="User accept/ignore decisions keyed by sentence id.",
    )
    citation_style: Literal["APA", "IEEE", "MLA"] = "APA"


# ── Update ────────────────────────────────────────────────────────────────────

class DocumentUpdateRequest(BaseModel):
    title: str | None = Field(None, max_length=500)
    decisions: DecisionMap | None = None
    citation_style: Literal["APA", "IEEE", "MLA"] | None = None
    pipeline_result: dict[str, Any] | None = None


# ── List item (dashboard) ─────────────────────────────────────────────────────

class DocumentListItem(BaseModel):
    id: UUID
    title: str
    citation_style: str
    created_at: datetime
    updated_at: datetime
    # Computed summary fields
    sentence_count: int = 0
    accepted_count: int = 0

    model_config = {"from_attributes": True}


# ── Full detail (editor reload) ───────────────────────────────────────────────

class DocumentDetailResponse(BaseModel):
    id: UUID
    title: str
    raw_text: str
    pipeline_result: dict[str, Any] | None
    decisions: DecisionMap
    citation_style: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Export ────────────────────────────────────────────────────────────────────

class ExportResponse(BaseModel):
    format: Literal["bibtex", "ris"]
    content: str
    filename: str
