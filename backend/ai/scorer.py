"""
Step 6: compute a final weighted confidence score for each paper.

Score = 0.40 × semantic_similarity
      + 0.20 × citation_count   (log-normalized against max in candidate set)
      + 0.15 × recency          (linear decay over 30 years — was 20, better for older classics)
      + 0.15 × keyword_overlap  (Jaccard between claim words and title+abstract)
      + 0.10 × llm_boost        (applied later by verifier: YES=0.10, PARTIAL=0.03)

FIX v2:
  - Recency window extended to 30 years to avoid penalising seminal papers
  - Citation log base changed from log1p(max) to log10 global cap for stability
  - Papers with 0 citation_count now get a small non-zero floor (0.05) so
    very recent preprints aren't wiped out
"""
import math
import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year

W_SEMANTIC = 0.40
W_CITATION = 0.20
W_RECENCY  = 0.15
W_KEYWORD  = 0.15
# W_LLM      = 0.10  (applied by verifier)

# Global citation cap for log normalisation (avoids score collapse for outlier papers)
_LOG_CAP = math.log1p(100_000)


def _citation_score(count: int, max_count: int) -> float:
    """Log-normalize citation count; floor is 0.05 for zero-cite papers."""
    if count <= 0:
        return 0.05  # small floor for very new / preprint papers
    local_max = max(max_count, 1)
    # Blend local max and global cap to avoid instability
    denom = min(math.log1p(local_max), _LOG_CAP)
    return math.log1p(count) / denom if denom > 0 else 0.0


def _recency_score(year: int | None) -> float:
    """Linear decay: current year → 1.0, 30+ years old → 0.0."""
    if not year:
        return 0.3  # neutral for unknown year
    age = max(0, CURRENT_YEAR - year)
    return float(max(0.0, 1.0 - age / 30.0))


def _keyword_score(claim_text: str, paper: dict) -> float:
    """Jaccard similarity between claim tokens and paper title+abstract tokens."""
    def tokenize(text: str) -> set[str]:
        return {w.lower() for w in re.findall(r"\b[a-zA-Z]{4,}\b", text)}

    stop = {
        "this", "that", "with", "from", "have", "been", "were", "they",
        "their", "also", "into", "more", "than", "some", "such", "when",
        "which", "these", "those", "each", "only", "both", "over",
    }

    claim_words = tokenize(claim_text) - stop
    paper_words = tokenize(
        (paper.get("title") or "") + " " + (paper.get("abstract") or "")
    ) - stop

    if not claim_words or not paper_words:
        return 0.0

    intersection = claim_words & paper_words
    union        = claim_words | paper_words
    return len(intersection) / len(union)


def compute_scores(papers: list[dict], claim_text: str) -> list[dict]:
    """
    Attach 'confidence_score' to each paper dict.
    Returns papers sorted descending by confidence_score.
    """
    if not papers:
        return papers

    max_cites = max((p.get("citation_count") or 0 for p in papers), default=1)

    for p in papers:
        sem  = float(p.get("semantic_score", 0.0))
        cite = _citation_score(p.get("citation_count") or 0, max_cites)
        rec  = _recency_score(p.get("year"))
        kw   = _keyword_score(claim_text, p)

        score = (
            W_SEMANTIC * sem
            + W_CITATION * cite
            + W_RECENCY  * rec
            + W_KEYWORD  * kw
        )
        p["confidence_score"] = round(min(1.0, max(0.0, score)), 4)

    return sorted(papers, key=lambda p: p["confidence_score"], reverse=True)
