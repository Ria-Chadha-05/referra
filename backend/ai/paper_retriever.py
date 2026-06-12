"""
Step 3 of the pipeline: retrieve candidate research papers from the
Semantic Scholar API for each detected claim.

Results are cached in the DB (cached_papers table) to avoid redundant API calls.
Falls back to OpenAlex if Semantic Scholar returns nothing.
"""
import logging
import httpx
from sqlalchemy.orm import Session
from db.models.paper import CachedPaper

logger = logging.getLogger(__name__)

SS_BASE = "https://api.semanticscholar.org/graph/v1"
OA_BASE = "https://api.openalex.org"

SS_FIELDS = (
    "title,authors,year,abstract,citationCount,"
    "externalIds,venue,journal,publicationVenue"
)


def _build_ss_headers(api_key: str) -> dict:
    headers = {}
    if api_key:
        headers["x-api-key"] = api_key
    return headers


def _normalize_ss_paper(p: dict) -> dict | None:
    """Convert a Semantic Scholar paper dict into our internal format."""
    title = p.get("title", "").strip()
    abstract = (p.get("abstract") or "").strip()
    if not title or not abstract:
        return None

    authors_raw = p.get("authors", [])
    if authors_raw:
        author_names = [a.get("name", "") for a in authors_raw[:6]]
        if len(authors_raw) > 6:
            author_names.append("et al.")
        authors = ", ".join(author_names)
    else:
        authors = "Unknown"

    journal = ""
    if p.get("journal") and p["journal"].get("name"):
        journal = p["journal"]["name"]
    elif p.get("publicationVenue") and p["publicationVenue"].get("name"):
        journal = p["publicationVenue"]["name"]
    elif p.get("venue"):
        journal = p["venue"]

    doi = (p.get("externalIds") or {}).get("DOI", "")
    ss_id = p.get("paperId", "")

    return {
        "title": title,
        "authors": authors,
        "year": p.get("year") or 0,
        "abstract": abstract,
        "citation_count": p.get("citationCount") or 0,
        "journal": journal,
        "volume": "",
        "pages": "",
        "doi": doi,
        "semantic_scholar_id": ss_id,
    }


def _check_cache(query: str, db: Session | None) -> list[dict] | None:
    """Not implemented for query-level caching — individual papers are cached by DOI/SS-id."""
    return None


def _cache_papers(papers: list[dict], db: Session | None) -> None:
    """Upsert retrieved papers into cached_papers table."""
    if db is None:
        return
    for p in papers:
        doi = p.get("doi") or None
        ss_id = p.get("semantic_scholar_id") or None
        if not doi and not ss_id:
            continue
        existing = None
        if doi:
            existing = db.query(CachedPaper).filter(CachedPaper.doi == doi).first()
        if not existing and ss_id:
            existing = db.query(CachedPaper).filter(
                CachedPaper.semantic_scholar_id == ss_id
            ).first()
        if existing:
            existing.citation_count = p.get("citation_count", existing.citation_count)
            continue
        db.add(
            CachedPaper(
                doi=doi,
                semantic_scholar_id=ss_id,
                title=p["title"],
                authors=p.get("authors", ""),
                year=p.get("year"),
                journal=p.get("journal", ""),
                abstract=p.get("abstract", ""),
                citation_count=p.get("citation_count", 0),
            )
        )
    try:
        db.commit()
    except Exception as e:
        logger.warning(f"Cache write failed: {e}")
        db.rollback()


async def _fetch_semantic_scholar(
    query: str, api_key: str, limit: int
) -> list[dict]:
    headers = _build_ss_headers(api_key)
    params = {"query": query, "limit": limit, "fields": SS_FIELDS}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{SS_BASE}/paper/search", params=params, headers=headers)
        resp.raise_for_status()
    data = resp.json()
    papers = []
    for p in data.get("data", []):
        normalized = _normalize_ss_paper(p)
        if normalized:
            papers.append(normalized)
    return papers


async def _fetch_openalex(query: str, limit: int) -> list[dict]:
    """Fallback: OpenAlex free API."""
    params = {
        "search": query,
        "per-page": limit,
        "select": "title,authorships,publication_year,abstract_inverted_index,cited_by_count,doi,primary_location",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{OA_BASE}/works", params=params)
        resp.raise_for_status()
    results = resp.json().get("results", [])
    papers = []
    for r in results:
        title = r.get("title", "").strip()
        if not title:
            continue
        # OpenAlex stores abstracts as inverted index — reconstruct
        inv = r.get("abstract_inverted_index") or {}
        abstract = _reconstruct_abstract(inv)
        if not abstract:
            continue
        author_ships = r.get("authorships", [])[:6]
        authors = ", ".join(
            a.get("author", {}).get("display_name", "") for a in author_ships
        )
        loc = r.get("primary_location") or {}
        source = loc.get("source") or {}
        journal = source.get("display_name", "")
        doi = (r.get("doi") or "").replace("https://doi.org/", "")
        papers.append(
            {
                "title": title,
                "authors": authors or "Unknown",
                "year": r.get("publication_year") or 0,
                "abstract": abstract,
                "citation_count": r.get("cited_by_count") or 0,
                "journal": journal,
                "volume": "",
                "pages": "",
                "doi": doi,
                "semantic_scholar_id": "",
            }
        )
    return papers


def _reconstruct_abstract(inverted_index: dict) -> str:
    """Reconstruct abstract text from OpenAlex inverted index format."""
    if not inverted_index:
        return ""
    word_positions = []
    for word, positions in inverted_index.items():
        for pos in positions:
            word_positions.append((pos, word))
    word_positions.sort(key=lambda x: x[0])
    return " ".join(w for _, w in word_positions)


async def retrieve_papers(
    query: str,
    api_key: str = "",
    limit: int = 10,
    db: Session | None = None,
) -> list[dict]:
    """
    Retrieve candidate papers for a claim query.
    Tries Semantic Scholar first, falls back to OpenAlex.

    Returns list of normalized paper dicts.
    """
    papers = []

    try:
        papers = await _fetch_semantic_scholar(query, api_key, limit)
        logger.debug(f"Semantic Scholar returned {len(papers)} papers for: {query[:60]}")
    except Exception as e:
        logger.warning(f"Semantic Scholar failed ({e}), trying OpenAlex fallback.")

    if not papers:
        try:
            papers = await _fetch_openalex(query, limit)
            logger.debug(f"OpenAlex returned {len(papers)} papers for: {query[:60]}")
        except Exception as e:
            logger.error(f"OpenAlex fallback also failed: {e}")

    if papers and db:
        _cache_papers(papers, db)

    return papers
