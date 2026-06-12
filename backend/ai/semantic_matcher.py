"""
Step 5 of the pipeline: compute cosine similarity between the claim sentence
embedding and each paper abstract embedding, then attach the score to each paper.

Because both embeddings are L2-normalized (done in embedder.py), cosine
similarity is just the dot product.
"""
import numpy as np
import logging

logger = logging.getLogger(__name__)


def rank_papers(
    sentence_embedding: np.ndarray,
    abstract_embeddings: np.ndarray,
    papers: list[dict],
) -> list[dict]:
    """
    Attach a 'semantic_score' to each paper dict and sort descending.

    Args:
        sentence_embedding:   shape (dim,)  — the claim sentence vector
        abstract_embeddings:  shape (n, dim) — one row per paper abstract
        papers:               list of paper dicts (mutated in place)

    Returns:
        Papers sorted by semantic_score descending.
    """
    if not papers or abstract_embeddings.size == 0:
        for p in papers:
            p["semantic_score"] = 0.0
        return papers

    if len(abstract_embeddings) != len(papers):
        logger.warning(
            f"Embedding count ({len(abstract_embeddings)}) != paper count ({len(papers)}). "
            "Assigning zero scores to unmatched papers."
        )
        min_len = min(len(abstract_embeddings), len(papers))
        scores = np.dot(abstract_embeddings[:min_len], sentence_embedding)
        for i, p in enumerate(papers):
            p["semantic_score"] = float(scores[i]) if i < min_len else 0.0
    else:
        # Dot product of normalized vectors = cosine similarity
        scores = np.dot(abstract_embeddings, sentence_embedding)
        for i, p in enumerate(papers):
            # Clamp to [0, 1] — can be slightly negative for unrelated texts
            p["semantic_score"] = float(max(0.0, scores[i]))

    return sorted(papers, key=lambda p: p["semantic_score"], reverse=True)
