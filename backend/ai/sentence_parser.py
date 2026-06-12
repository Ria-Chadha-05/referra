"""
Step 1 of the pipeline: split raw text into individual sentences using spaCy.
Returns a list of dicts with id, text, start/end character offsets.
"""
import spacy

# Load once at module import time — avoids reloading per request
_nlp = None


def get_nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm", disable=["ner", "lemmatizer"])
    return _nlp


def parse_sentences(text: str) -> list[dict]:
    """
    Split text into sentences.

    Returns:
        [
            {"id": 0, "text": "Deep learning has ...", "start": 0, "end": 42},
            ...
        ]
    """
    nlp = get_nlp()
    doc = nlp(text.strip())

    sentences = []
    for i, sent in enumerate(doc.sents):
        sentence_text = sent.text.strip()
        # Skip very short fragments (e.g. stray punctuation)
        if len(sentence_text) < 10:
            continue
        sentences.append(
            {
                "id": i,
                "text": sentence_text,
                "start": sent.start_char,
                "end": sent.end_char,
            }
        )

    return sentences
