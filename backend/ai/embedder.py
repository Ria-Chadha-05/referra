"""
Step 4 of the pipeline: convert the claim sentence and each paper abstract
into dense semantic vectors using sentence-transformers.

The model is loaded once at module level and reused across requests.
"""
import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from config import settings

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    """Lazy-load the embedding model (singleton)."""
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded.")
    return _model


def embed_sentence(text: str) -> np.ndarray:
    """
    Embed a single sentence.

    Returns:
        1-D numpy array of shape (embedding_dim,), L2-normalized.
    """
    model = get_model()
    return model.encode(text, normalize_embeddings=True, show_progress_bar=False)


def embed_abstracts(abstracts: list[str]) -> np.ndarray:
    """
    Embed a list of paper abstracts in batch.

    Returns:
        2-D numpy array of shape (n_papers, embedding_dim), L2-normalized.
        Returns empty array if abstracts list is empty.
    """
    if not abstracts:
        return np.array([])
    model = get_model()
    return model.encode(
        abstracts,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=32,
    )


def embed_texts(
    sentence: str, abstracts: list[str]
) -> tuple[np.ndarray, np.ndarray]:
    """
    Convenience wrapper — embed both the claim sentence and all abstracts.

    Returns:
        (sentence_embedding, abstracts_embeddings)
    """
    s_emb = embed_sentence(sentence)
    p_embs = embed_abstracts(abstracts)
    return s_emb, p_embs
