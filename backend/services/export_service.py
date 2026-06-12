"""
Export service — converts accepted citations in a saved document into
downloadable BibTeX or RIS format.

Decision schema (frontend DecisionMap):
  { "acceptedIndices": [0, 1, ...], "ignored": bool }

Keys are sentence IDs as strings.
"""
import re
import logging
from db.models.document import Document

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_accepted_refs(doc: Document) -> list[dict]:
    """
    Extract accepted reference dicts from the stored pipeline result.

    Reads the DecisionMap format used by the frontend:
      { "<sentence_id>": { "acceptedIndices": [0, 2], "ignored": false } }

    Returns refs in text order, each with a 1-based ref_number.
    """
    decisions   = doc.decisions or {}
    pipeline    = doc.pipeline_result or {}
    sentences   = pipeline.get("sentences", [])
    suggestions = pipeline.get("suggestions", [])

    # Build a lookup: sentence_id (int) → suggestion dict
    suggestion_map: dict[int, dict] = {
        s["sentence_id"]: s for s in suggestions
    }

    accepted = []
    ref_num  = 1

    for sentence in sentences:
        sid = sentence["id"]
        # keys may be stored as str or int
        dec = decisions.get(str(sid)) or decisions.get(sid)

        if not dec:
            continue

        # New format: acceptedIndices list
        accepted_indices = dec.get("acceptedIndices", [])
        if not accepted_indices:
            continue

        suggestion = suggestion_map.get(sid)
        if not suggestion:
            continue

        refs = suggestion.get("refs", [])
        for ri in sorted(accepted_indices):
            if ri < len(refs):
                ref = refs[ri].copy()
                ref["ref_number"] = ref_num
                accepted.append(ref)
                ref_num += 1

    return accepted


def _bibtex_key(ref: dict) -> str:
    """Generate a BibTeX citation key like Smith2023."""
    authors = ref.get("authors", "Unknown")
    first_author_last = authors.split(",")[0].strip().split()[-1]
    first_author_last = re.sub(r"[^a-zA-Z0-9]", "", first_author_last)
    year = ref.get("year") or "0000"
    return f"{first_author_last}{year}"


def _format_bibtex(refs: list[dict]) -> str:
    entries = []
    for ref in refs:
        key     = _bibtex_key(ref)
        lines   = [f"@article{{{key},"]
        lines.append(f"  title     = {{{ref.get('title', '')}}},")
        lines.append(f"  author    = {{{ref.get('authors', '')}}},")
        if ref.get("year"):
            lines.append(f"  year      = {{{ref['year']}}},")
        if ref.get("journal"):
            lines.append(f"  journal   = {{{ref['journal']}}},")
        if ref.get("volume"):
            lines.append(f"  volume    = {{{ref['volume']}}},")
        if ref.get("pages"):
            lines.append(f"  pages     = {{{ref['pages']}}},")
        if ref.get("doi"):
            lines.append(f"  doi       = {{{ref['doi']}}},")
        lines.append("}")
        entries.append("\n".join(lines))
    return "\n\n".join(entries)


def _format_ris(refs: list[dict]) -> str:
    entries = []
    for ref in refs:
        lines = ["TY  - JOUR"]
        if ref.get("title"):
            lines.append(f"TI  - {ref['title']}")
        for author in (ref.get("authors") or "").split(","):
            author = author.strip()
            if author and author.lower() != "et al.":
                lines.append(f"AU  - {author}")
        if ref.get("year"):
            lines.append(f"PY  - {ref['year']}")
        if ref.get("journal"):
            lines.append(f"JO  - {ref['journal']}")
        if ref.get("volume"):
            lines.append(f"VL  - {ref['volume']}")
        pages = ref.get("pages", "")
        if pages and "–" in pages:
            sp, ep = pages.split("–", 1)
            lines.append(f"SP  - {sp.strip()}")
            lines.append(f"EP  - {ep.strip()}")
        elif pages:
            lines.append(f"SP  - {pages}")
        if ref.get("doi"):
            lines.append(f"DO  - {ref['doi']}")
        if ref.get("abstract"):
            lines.append(f"AB  - {ref['abstract'][:500]}")
        lines.append("ER  - ")
        entries.append("\n".join(lines))
    return "\n\n".join(entries)


def _safe_filename(title: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", title)
    return safe[:40].strip("_") or "document"


# ── Public API ────────────────────────────────────────────────────────────────

def export_document(doc: Document, fmt: str = "bibtex") -> dict:
    accepted = _get_accepted_refs(doc)

    if not accepted:
        return {
            "format": fmt,
            "content": f"% No accepted citations found in document '{doc.title}'",
            "filename": f"referra_export.{'bib' if fmt == 'bibtex' else 'ris'}",
        }

    if fmt == "bibtex":
        content  = _format_bibtex(accepted)
        filename = f"referra_{_safe_filename(doc.title)}.bib"
    else:
        content  = _format_ris(accepted)
        filename = f"referra_{_safe_filename(doc.title)}.ris"

    logger.info(f"Exported {len(accepted)} citations for doc {doc.id} as {fmt}.")
    return {"format": fmt, "content": content, "filename": filename}
