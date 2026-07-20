"""OpenAI chat helper with dry-run / no-key template fallback."""

from __future__ import annotations

import os
from typing import Optional

from agent_rules import agent_model, pick_helpful_fallback


def llm_complete(
    system: str,
    user: str,
    *,
    dry_run: bool = False,
    temperature: float = 0.85,
) -> str:
    if dry_run or not os.getenv("OPENAI_API_KEY", "").strip():
        return _fallback(system, user)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())
        resp = client.chat.completions.create(
            model=agent_model(),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text or _fallback(system, user)
    except Exception as exc:  # noqa: BLE001
        print(f"  LLM warning: {exc} — using template fallback")
        return _fallback(system, user)


def _fallback(system: str, user: str) -> str:
    """Varied paste-ready stub when LLM unavailable."""
    lower = (system + "\n" + user).lower()
    if "short_script" in lower or "45–60s" in lower or "45-60s" in lower:
        return (
            "HOOK: Stuck at 6.5? It's usually one undercooked idea — not grammar.\n"
            "ON SCREEN: weak sentence → tighter rewrite.\n"
            "SAY: Finish the point with a real example before you move on.\n"
            "CTA: Free criterion notes if you want them — link in bio.\n"
        )
    if "quora" in lower and ("answer" in lower or "300" in lower):
        return (
            "Most people stuck around 6.5 aren't missing 'big words'. "
            "They're stopping mid-idea.\n\n"
            "Try: clear topic sentence → one specific example → then the next point. "
            "That alone lifts Task Response more than synonym hunting.\n\n"
            "Paste a paragraph if you want a single highest-impact fix."
        )
    if "follow-up" in lower or "followup" in lower:
        return (
            "Nice — glad that landed. Paste the next paragraph and I'll mark the one "
            "change that moves the band most."
        )
    return pick_helpful_fallback()
