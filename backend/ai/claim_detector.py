"""
Step 2 of the pipeline: classify each sentence and decide how many
citations it needs (0, 1, or multiple).

citation_count returned per sentence:
  0 — obvious statement, no citation needed
  1 — single specific claim
  2 — broad claim that benefits from multiple supporting sources
"""
import json
import logging
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)

_client = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


CLAIM_KEYWORDS = (
    r"study|studies|research|researchers|found|shows?|showed|demonstrate[sd]?"
    r"|evidence|data|percent|%|significant|outperform|introduc|achiev"
    r"|results?|findings?|analysis|analyses|suggests?|indicates?|reveals?"
    r"|published|journal|compared|higher|lower|increased|decreased|reported"
)


def _keyword_fallback(sentences: list[dict]) -> list[dict]:
    import re
    pattern = re.compile(CLAIM_KEYWORDS, re.IGNORECASE)
    for s in sentences:
        s["is_claim"]        = bool(pattern.search(s["text"]))
        s["claim_type"]      = "empirical" if s["is_claim"] else "none"
        s["citation_count"]  = 1 if s["is_claim"] else 0
    return sentences


async def detect_claims(sentences: list[dict]) -> list[dict]:
    """
    For each sentence decide:
      - is_claim: does it need any citation at all?
      - claim_type: empirical | statistical | methodological | theoretical | none
      - citation_count: 0 = skip, 1 = single ref, 2 = multiple refs suggested
    """
    if not sentences:
        return sentences

    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — using keyword fallback.")
        return _keyword_fallback(sentences)

    numbered = "\n".join(f'{s["id"] + 1}. "{s["text"]}"' for s in sentences)

    prompt = f"""You are an expert academic writing assistant. For each sentence decide:

1. Does it need a citation at all?
2. If yes, how many citations does it need?

Sentences:
{numbered}

Rules:
- citation_count = 0: obvious facts, definitions, transitions, rhetorical statements, or
  conclusions that don't assert new empirical facts. Examples: "AI is used in many fields",
  "this raises important questions", "researchers are working on this".
- citation_count = 1: a single specific claim, finding, or methodological statement that
  can be supported by one strong paper.
- citation_count = 2: a broad sweeping claim that covers multiple sub-topics and genuinely
  benefits from 2 supporting sources. Use sparingly.
- is_claim = false when citation_count = 0
- is_claim = true when citation_count >= 1

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{{"index": 1, "is_claim": true, "claim_type": "empirical", "citation_count": 1}}, ...]

claim_type must be one of: empirical, statistical, methodological, theoretical, none"""

    try:
        client = get_client()
        resp = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=900,
            temperature=0.1,
        )
        raw = resp.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        parsed: list[dict] = json.loads(raw)

        lookup = {item["index"]: item for item in parsed}

        for s in sentences:
            match = lookup.get(s["id"] + 1, {})
            s["is_claim"]       = match.get("is_claim", False)
            s["claim_type"]     = match.get("claim_type", "none")
            s["citation_count"] = match.get("citation_count", 0)

        return sentences

    except Exception as exc:
        logger.error(f"Claim detection failed: {exc}. Using keyword fallback.")
        return _keyword_fallback(sentences)
