"""
Step 7 of the pipeline: use the LLM to verify whether each candidate paper
actually supports the claim, and apply a score boost accordingly.

Verdict → boost applied to confidence_score:
  YES     → +0.10  (strong evidence, domain matches)
  PARTIAL → +0.03  (somewhat related but domain-specific or indirect)
  NO      →  0.00  (unrelated — filtered out of final results)

Also detects and tags domain-specific papers so the frontend can display
a domain label on the citation card.
"""
import json
import logging
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)

BOOST_MAP = {"YES": 0.10, "PARTIAL": 0.03, "NO": 0.00}

_client = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


def _fallback_verify(papers: list[dict]) -> list[dict]:
    """If LLM unavailable, mark all as PARTIAL with no boost."""
    for p in papers:
        p.setdefault("verification_status", "PARTIAL")
        p.setdefault("domain_tag", None)
    return papers


async def verify_papers(claim: str, papers: list[dict]) -> list[dict]:
    """
    Ask the LLM to:
      1. Verify each paper against the claim (YES / PARTIAL / NO)
      2. Detect if the paper is domain-specific and return a short domain label
         e.g. "Construction", "Quantum Computing", "Healthcare"

    Mutates papers in place:
      - Adds 'verification_status': "YES" | "PARTIAL" | "NO"
      - Adds 'domain_tag': short domain string or null if general
      - Applies score boost to 'confidence_score'
      - Filters out papers with verdict "NO"

    Returns the filtered and updated list sorted by confidence_score descending.
    """
    if not papers:
        return papers

    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — skipping LLM verification.")
        return _fallback_verify(papers)

    # Only send top 5 to keep token usage low
    candidates = papers[:5]

    pairs = "\n\n".join(
        f'{i + 1}. Title: "{p["title"]}"\n   Abstract: "{(p.get("abstract") or "")[:400]}"'
        for i, p in enumerate(candidates)
    )

    prompt = f"""You are a strict academic peer reviewer. For each paper below, evaluate whether it supports the following claim.

Claim: "{claim}"

Papers:
{pairs}

For each paper decide:

VERDICT rules (be strict — when in doubt mark NO):
- YES      — the paper directly and generally supports the claim. The domain of the paper matches the domain of the claim.
- PARTIAL  — the paper is related but applies to a specific domain that differs from the claim's domain (e.g. claim is about AI in general, paper is about AI in construction). Still useful but domain-specific.
- NO       — the paper is unrelated, off-topic, or its domain has no meaningful connection to the claim. Mark NO if the paper is about a completely different field (e.g. quantum computing paper for a claim about data availability driving AI growth).

DOMAIN TAG rules:
- If the paper is domain-specific (applies to one industry/field), return a short 1-3 word domain label e.g. "Construction", "Healthcare", "Quantum Computing", "Finance"
- If the paper is general / cross-domain, return null for domain_tag

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{{"index": 1, "verdict": "YES", "domain_tag": null}}, {{"index": 2, "verdict": "PARTIAL", "domain_tag": "Construction"}}, ...]"""

    try:
        client = get_client()
        resp = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.0,
        )
        raw = resp.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        results: list[dict] = json.loads(raw)

        lookup = {r["index"]: r for r in results}

        for i, p in enumerate(candidates):
            result     = lookup.get(i + 1, {})
            verdict    = result.get("verdict", "PARTIAL")
            domain_tag = result.get("domain_tag", None)

            if verdict not in ("YES", "PARTIAL", "NO"):
                verdict = "PARTIAL"

            p["verification_status"] = verdict
            p["domain_tag"]          = domain_tag if domain_tag else None
            p["confidence_score"]    = round(
                min(1.0, p.get("confidence_score", 0.0) + BOOST_MAP[verdict]), 4
            )

        # Papers beyond top-5 get PARTIAL + no domain tag by default
        for p in papers[5:]:
            p.setdefault("verification_status", "PARTIAL")
            p.setdefault("domain_tag", None)

        # Filter out NO verdicts entirely
        verified = [p for p in papers if p.get("verification_status") != "NO"]

        return sorted(verified, key=lambda p: p["confidence_score"], reverse=True)

    except Exception as exc:
        logger.error(f"LLM verification failed: {exc}. Skipping verification step.")
        return _fallback_verify(papers)
