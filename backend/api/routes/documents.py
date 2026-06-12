"""
Document routes (all require authentication):
  GET    /documents/              — list all documents for current user
  POST   /documents/              — save a new document
  GET    /documents/{id}          — load a single document (full detail)
  PUT    /documents/{id}          — update title / decisions / citation_style
  DELETE /documents/{id}          — delete a document
  GET    /documents/{id}/export   — export accepted citations as BibTeX or RIS
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from uuid import UUID

from db.database import get_db
from db.models.user import User
from db.models.document import Document
from schemas.document import (
    DocumentCreateRequest,
    DocumentUpdateRequest,
    DocumentListItem,
    DocumentDetailResponse,
    ExportResponse,
)
from api.deps import get_current_user
from services.document_service import (
    create_document,
    get_document_or_404,
    list_documents,
    update_document,
    delete_document,
)
from services.export_service import export_document

router = APIRouter()


# ── List ──────────────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[DocumentListItem],
    summary="List all saved documents for the current user",
)
def list_docs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_documents(db, user_id=current_user.id, skip=skip, limit=limit)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=DocumentDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new document with its pipeline result and decisions",
)
def create_doc(
    payload: DocumentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_document(db, user_id=current_user.id, payload=payload)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get(
    "/{doc_id}",
    response_model=DocumentDetailResponse,
    summary="Load a single saved document",
)
def get_doc(
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_document_or_404(db, doc_id=doc_id, user_id=current_user.id)
    return DocumentDetailResponse.model_validate(doc)


# ── Update ────────────────────────────────────────────────────────────────────

@router.put(
    "/{doc_id}",
    response_model=DocumentDetailResponse,
    summary="Update document title, decisions, or citation style",
)
def update_doc(
    doc_id: UUID,
    payload: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_document_or_404(db, doc_id=doc_id, user_id=current_user.id)
    return update_document(db, doc=doc, payload=payload)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete(
    "/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
)
def delete_doc(
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_document_or_404(db, doc_id=doc_id, user_id=current_user.id)
    delete_document(db, doc=doc)


# ── Export ────────────────────────────────────────────────────────────────────

@router.get(
    "/{doc_id}/export",
    summary="Export accepted citations as BibTeX or RIS",
)
def export_doc(
    doc_id: UUID,
    format: str = Query("bibtex", pattern="^(bibtex|ris)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_document_or_404(db, doc_id=doc_id, user_id=current_user.id)
    result = export_document(doc=doc, fmt=format)

    media_type = "application/x-bibtex" if format == "bibtex" else "application/x-research-info-systems"
    return PlainTextResponse(
        content=result["content"],
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{result["filename"]}"'},
    )
