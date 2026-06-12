"""
Cache service — check and store retrieved papers in the cached_papers table.

Reduces redundant Semantic Scholar / OpenAlex API calls for papers that
have already been retrieved in a previous analysis session.
"""
import logging
from sqlalchemy.orm import Session

from db.models.paper import CachedPaper

logger = logging.getLogger(__name__)


def get_cached_paper_by_doi(db: Session, doi: str) -> CachedPaper | None:
    """Look up a cached paper by DOI. Returns None if not found."""
    if not doi:
        return None
    return db.query(CachedPaper).filter(CachedPaper.doi == doi).first()


def get_cached_paper_by_ss_id(db: Session, ss_id: str) -> CachedPaper | None:
    """Look up a cached paper by Semantic Scholar paper ID."""
    if not ss_id:
        return None
    return (
        db.query(CachedPaper)
        .filter(CachedPaper.semantic_scholar_id == ss_id)
        .first()
    )


def upsert_paper(db: Session, paper: dict) -> CachedPaper | None:
    """
    Insert a new cached paper or update citation count if it already exists.

    Args:
        paper: Normalized paper dict from paper_retriever.py

    Returns:
        The CachedPaper ORM row, or None if the paper couldn't be cached
        (e.g. missing both DOI and SS id).
    """
    doi   = paper.get("doi") or None
    ss_id = paper.get("semantic_scholar_id") or None

    if not doi and not ss_id:
        return None  # Not enough identifiers to cache reliably

    # Try to find existing row
    existing = None
    if doi:
        existing = get_cached_paper_by_doi(db, doi)
    if not existing and ss_id:
        existing = get_cached_paper_by_ss_id(db, ss_id)

    if existing:
        # Refresh citation count if we have an updated value
        new_count = paper.get("citation_count", 0)
        if new_count > existing.citation_count:
            existing.citation_count = new_count
        try:
            db.commit()
        except Exception as e:
            logger.warning(f"Cache update failed: {e}")
            db.rollback()
        return existing

    # Insert new
    cached = CachedPaper(
        doi=doi,
        semantic_scholar_id=ss_id,
        title=paper.get("title", ""),
        authors=paper.get("authors", ""),
        year=paper.get("year"),
        journal=paper.get("journal", ""),
        volume=paper.get("volume", ""),
        pages=paper.get("pages", ""),
        abstract=paper.get("abstract", ""),
        citation_count=paper.get("citation_count", 0),
    )
    db.add(cached)
    try:
        db.commit()
        db.refresh(cached)
    except Exception as e:
        logger.warning(f"Cache insert failed: {e}")
        db.rollback()
        return None

    return cached


def bulk_upsert_papers(db: Session, papers: list[dict]) -> None:
    """Upsert multiple papers — used after a retrieval batch."""
    for p in papers:
        upsert_paper(db, p)


def get_cache_stats(db: Session) -> dict:
    """Return basic stats about the paper cache."""
    total = db.query(CachedPaper).count()
    return {"cached_papers": total}
