"""
Main pipeline orchestrator.

Key behaviours:
  - citation_count=0  → sentence skipped entirely (no refs fetched)
  - citation_count=1  → up to TOP_REFS_TO_RETURN suggestions returned
  - citation_count=2  → up to TOP_REFS_TO_RETURN+1 suggestions, user can pick multiple
  - Duplicate detection: papers with same DOI or same title (normalised) are
    deduplicated globally across all suggestions before returning results.
"""
import logging
import asyncio
import re
from sqlalchemy.orm import Session

from config import settings
from .sentence_parser  import parse_sentences
from .claim_detector   import detect_claims
from .paper_retriever  import retrieve_papers
from .embedder         import embed_texts
from .semantic_matcher import rank_papers
from .scorer           import compute_scores
from .verifier         import verify_papers

logger = logging.getLogger(__name__)


def _normalise_title(title: str) -> str:
    """Lowercase, strip punctuation — used for duplicate detection."""
    return re.sub(r"[^a-z0-9]", "", title.lower())


def _deduplicate_globally(suggestions: list[dict]) -> list[dict]:
    """
    Remove refs that appear in more than one suggestion (same DOI or same
    normalised title). Keeps the first occurrence (highest-scored sentence).
    Also removes duplicates within a single suggestion's ref list.
    """
    seen_dois   : set[str] = set()
    seen_titles : set[str] = set()

    for suggestion in suggestions:
        unique_refs = []
        for ref in suggestion.get("refs", []):
            doi    = (ref.get("doi") or "").strip()
            ntitle = _normalise_title(ref.get("title") or "")

            # Skip if we've seen this paper in any previous suggestion
            if doi   and doi   in seen_dois:   continue
            if ntitle and ntitle in seen_titles: continue

            # Also skip duplicates within this suggestion's own list
            if doi:    seen_dois.add(doi)
            if ntitle: seen_titles.add(ntitle)

            unique_refs.append(ref)

        suggestion["refs"] = unique_refs

    # Drop suggestions that ended up with no refs after dedup
    return [s for s in suggestions if s["refs"]]


async def _process_claim(
    sentence:  dict,
    api_key:   str,
    limit:     int,
    top_n:     int,
    db:        Session | None,
) -> dict | None:
    """
    Run steps 3–7 for a single claim sentence.
    top_n is increased by 1 when citation_count=2 so the user has more choices.
    """
    sid            = sentence["id"]
    text           = sentence["text"]
    citation_count = sentence.get("citation_count", 1)

    # Fetch slightly more candidates when multiple citations are expected
    effective_top_n = top_n + 1 if citation_count >= 2 else top_n

    papers = await retrieve_papers(text, api_key=api_key, limit=limit, db=db)
    if not papers:
        logger.debug(f"No papers found for sentence {sid}")
        return None

    abstracts        = [p.get("abstract", "") for p in papers]
    s_emb, p_embs   = embed_texts(text, abstracts)
    papers           = rank_papers(s_emb, p_embs, papers)
    papers           = compute_scores(papers, text)
    papers           = await verify_papers(text, papers)

    if not papers:
        return None

    refs = []
    for rank, p in enumerate(papers[:effective_top_n]):
        refs.append({
            "ref_id":              f"{sid}-{rank}",
            "title":               p.get("title", ""),
            "authors":             p.get("authors", ""),
            "year":                p.get("year") or 0,
            "journal":             p.get("journal", ""),
            "volume":              p.get("volume", ""),
            "pages":               p.get("pages", ""),
            "doi":                 p.get("doi", ""),
            "citation_count":      p.get("citation_count", 0),
            "abstract":            (p.get("abstract") or "")[:600],
            "verification_status": p.get("verification_status", "PARTIAL"),
            "confidence_score":    p.get("confidence_score", 0.0),
            "semantic_score":      p.get("semantic_score", 0.0),
            "domain_tag":          p.get("domain_tag", None),
        })

    return {
        "sentence_id":    sid,
        "citation_count": citation_count,   # pass through so frontend knows
        "refs":           refs,
    }


async def run_pipeline(
    text:           str,
    citation_style: str          = "APA",
    db:             Session | None = None,
) -> dict:
    sentences = parse_sentences(text)
    logger.info(f"Parsed {len(sentences)} sentences.")

    if not sentences:
        return {
            "sentences": [], "suggestions": [],
            "citation_style": citation_style,
            "total_claims": 0, "total_refs_found": 0,
        }

    sentences = await detect_claims(sentences)

    # Only process sentences that actually need citations (citation_count >= 1)
    claims = [s for s in sentences if s.get("is_claim") and s.get("citation_count", 0) >= 1]
    logger.info(f"Detected {len(claims)} citation-needing claims out of {len(sentences)} sentences.")

    tasks = [
        _process_claim(
            sentence=s,
            api_key=settings.SEMANTIC_SCHOLAR_API_KEY,
            limit=settings.MAX_PAPERS_PER_CLAIM,
            top_n=settings.TOP_REFS_TO_RETURN,
            db=db,
        )
        for s in claims
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    suggestions = []
    for r in results:
        if isinstance(r, Exception):
            logger.error(f"Claim processing error: {r}")
        elif r is not None:
            suggestions.append(r)

    # Global duplicate removal across all suggestions
    suggestions = _deduplicate_globally(suggestions)

    formatted_sentences = [
        {
            "id":             s["id"],
            "text":           s["text"],
            "is_claim":       s.get("is_claim", False),
            "claim_type":     s.get("claim_type", "none"),
            "citation_count": s.get("citation_count", 0),
        }
        for s in sentences
    ]

    total_refs = sum(len(s["refs"]) for s in suggestions)
    logger.info(f"Pipeline complete. {len(suggestions)} suggestions, {total_refs} refs.")

    return {
        "sentences":        formatted_sentences,
        "suggestions":      suggestions,
        "citation_style":   citation_style,
        "total_claims":     len(claims),
        "total_refs_found": total_refs,
    }
