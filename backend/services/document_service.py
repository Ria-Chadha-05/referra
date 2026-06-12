"""
Document service — all DB operations for the documents resource.

Called by api/routes/documents.py. Keeps route handlers thin and
business logic testable independently of FastAPI.
"""
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from db.models.document import Document
from schemas.document import (
    DocumentCreateRequest,
    DocumentUpdateRequest,
    DocumentListItem,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_document_or_404(db: Session, doc_id: UUID, user_id: UUID) -> Document:
    """
    Fetch a document by id, scoped to the current user.
    Raises 404 if not found or belongs to another user.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return doc


def _count_accepted(decisions: dict) -> int:
    """
    Count total accepted citations.
    Reads the frontend DecisionMap schema:
      { "<sentence_id>": { "acceptedIndices": [0, 1], "ignored": bool } }
    """
    if not decisions:
        return 0
    total = 0
    for v in decisions.values():
        if isinstance(v, dict):
            indices = v.get("acceptedIndices", [])
            if isinstance(indices, list):
                total += len(indices)
    return total


def _count_sentences(pipeline_result: dict | None) -> int:
    """Return number of sentences from stored pipeline result."""
    if not pipeline_result:
        return 0
    return len(pipeline_result.get("sentences", []))


# ── List ──────────────────────────────────────────────────────────────────────

def list_documents(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 20,
) -> list[DocumentListItem]:
    """Return paginated list of document summaries for the dashboard."""
    docs = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for doc in docs:
        result.append(
            DocumentListItem(
                id=doc.id,
                title=doc.title,
                citation_style=doc.citation_style,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                sentence_count=_count_sentences(doc.pipeline_result),
                accepted_count=_count_accepted(doc.decisions or {}),
            )
        )
    return result


# ── Create ────────────────────────────────────────────────────────────────────

def create_document(
    db: Session,
    user_id: UUID,
    payload: DocumentCreateRequest,
) -> Document:
    """
    Persist a new document with its pipeline result and initial decisions.
    """
    doc = Document(
        user_id=user_id,
        title=payload.title or "Untitled Document",
        raw_text=payload.raw_text,
        pipeline_result=payload.pipeline_result,
        decisions=payload.decisions or {},
        citation_style=payload.citation_style,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


# ── Update ────────────────────────────────────────────────────────────────────

def update_document(
    db: Session,
    doc: Document,
    payload: DocumentUpdateRequest,
) -> Document:
    """
    Apply partial updates to a document.
    Only fields that are explicitly set in the payload are changed.
    """
    if payload.title is not None:
        doc.title = payload.title

    if payload.decisions is not None:
        doc.decisions = payload.decisions

    if payload.citation_style is not None:
        doc.citation_style = payload.citation_style

    if payload.pipeline_result is not None:
        doc.pipeline_result = payload.pipeline_result

    db.commit()
    db.refresh(doc)
    return doc


# ── Delete ────────────────────────────────────────────────────────────────────

def delete_document(db: Session, doc: Document) -> None:
    """Hard-delete a document and its cascaded rows."""
    db.delete(doc)
    db.commit()
