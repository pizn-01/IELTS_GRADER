"""OpenAI chat helper with dry-run / no-key template fallback."""

from __future__ import annotations

import os
from typing import Optional

from agent_rules import agent_model, HELPFUL_REPLY_EXAMPLE


def llm_complete(system: str, user: str, *, dry_run: bool = False) -> str:
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
            temperature=0.6,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text or _fallback(system, user)
    except Exception as exc:  # noqa: BLE001
        print(f"  LLM warning: {exc} — using template fallback")
        return _fallback(system, user)


def _fallback(system: str, user: str) -> str:
    """Deterministic paste-ready stub when LLM unavailable."""
    lower = (system + "\n" + user).lower()
    if "short_script" in lower or "45–60s" in lower or "45-60s" in lower:
        return (
            "HOOK: This Band 6 sentence is why you're stuck at 6.5.\n"
            "ON SCREEN: show the weak sentence, then a Band 7 rewrite.\n"
            "FIX: Clarify your position in Task Response — one clear view, developed with a specific example.\n"
            "CTA: Get criterion-by-criterion feedback free — link in bio / link below.\n"
        )
    if "quora" in lower and ("answer" in lower or "300" in lower):
        return (
            "IELTS Writing is scored on four criteria: Task Response, Coherence & Cohesion, "
            "Lexical Resource, and Grammatical Range & Accuracy.\n\n"
            "If you're stuck around 6.5, the usual issue isn't 'more big words' — it's under-developed "
            "ideas (TR) and weak paragraph logic (CC).\n\n"
            "Try this: write a clear topic sentence, then add one concrete example before your next point.\n\n"
            "Happy to sketch a fix for one paragraph if you paste it."
        )
    if "follow-up" in lower or "followup" in lower:
        return (
            "Glad that helped. If you paste the next paragraph, I'll point to the single highest-impact fix "
            "(usually Task Response or Coherence)."
        )
    # Default engage reply
    return HELPFUL_REPLY_EXAMPLE + (
        "\n\nIf you paste one paragraph, I can hint at the highest-impact fix."
    )
