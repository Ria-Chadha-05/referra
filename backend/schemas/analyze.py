from pydantic import BaseModel, Field
from typing import Literal


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=20, max_length=10000)
    citation_style: Literal["APA", "IEEE", "MLA"] = "APA"


class SentenceOut(BaseModel):
    id: int
    text: str
    is_claim: bool
    claim_type: Literal["empirical", "statistical", "methodological", "theoretical", "none"] = "none"
    # 0 = no citation needed, 1 = single, 2 = multiple
    citation_count: int = 0


class ReferenceOut(BaseModel):
    ref_id: str
    title: str
    authors: str
    year: int | None
    journal: str | None
    volume: str | None = None
    pages: str | None = None
    doi: str | None = None
    citation_count: int = 0
    abstract: str | None = None
    verification_status: Literal["YES", "PARTIAL", "NO"] = "PARTIAL"
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    semantic_score: float = Field(0.0, ge=0.0, le=1.0)
    domain_tag: str | None = None


class SuggestionOut(BaseModel):
    sentence_id: int
    # How many citations the LLM recommends for this sentence
    citation_count: int = 1
    refs: list[ReferenceOut]


class AnalyzeResponse(BaseModel):
    sentences: list[SentenceOut]
    suggestions: list[SuggestionOut]
    citation_style: str
    total_claims: int
    total_refs_found: int
