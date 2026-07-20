"""
EMPLOYEE_PLAYBOOK.pdf encoded as constants + validators.
Source of truth for Social Ops Agent drafts. Never auto-posts.
"""

from __future__ import annotations

import os
import re
from typing import Optional
from urllib.parse import urlencode, urlparse, urlunparse, parse_qs

# ---------------------------------------------------------------------------
# §1 Mission & product facts
# ---------------------------------------------------------------------------

POSITIONING = (
    "IELTS AI Tutor by IELTSGRADER — Your AI writing tutor that grades essays "
    "in 60 seconds, explains every mistake, and builds a personalized plan to "
    "reach your target band."
)

PRIMARY_CTA = "Get your free band score"
SITE = "https://ieltsgrader.com"

WHAT_WE_ARE = [
    "AI writing tutor for IELTS (Task 1 & 2, Academic & General Training)",
    "Criterion-by-criterion feedback (TR, CC, LR, GRA) — not just a score",
    "Fix cards, model answers, study plans, mock exam mode",
    "Free evaluation to start — no card required for first-try messaging",
]

NEVER_SAY = [
    "just a grader",
    "chatgpt wrapper",
    "guaranteed band 7",
    "100% accurate",
    "official ielts replacement",
    "10k students",
    "4.9 rating",
]

BANNED_PHRASE_REPLACEMENTS = {
    "100% accurate": "Aligned with official band descriptors",
    "guaranteed band 7": "Plan toward your target band",
    "best ielts grader": "AI tutor with criterion-level feedback",
}

APPROVED_URLS = [
    "https://ieltsgrader.com",
    "https://ieltsgrader.com/ielts-ai-tutor",
    "https://ieltsgrader.com/ielts-essay-checker",
    "https://ieltsgrader.com/ielts-task-2-checker",
    "https://ieltsgrader.com/ielts-task-1-checker",
    "https://ieltsgrader.com/blog",
]

DISCLOSURE = (
    "Full disclosure: I'm affiliated with IELTS AI Tutor by IELTSGRADER "
    "(ieltsgrader.com)."
)

SOFT_CTA = (
    "If you want criterion-by-criterion feedback in about a minute, we built a "
    "free evaluation at ieltsgrader.com — no pressure either way."
)

# Rotating human soft CTAs (pick one when product is allowed — never identical boilerplate)
SOFT_CTA_POOL = [
    SOFT_CTA,
    "If you ever want a free band breakdown (TR/CC/LR/GRA), there's one at ieltsgrader.com — totally optional.",
    "We made a free essay check that shows criterion notes in about a minute: ieltsgrader.com. Ignore if you're good.",
    "Side note only if useful — free writing check at ieltsgrader.com. Happy to keep helping here either way.",
]

HELPFUL_REPLY_FALLBACKS = [
    "Paragraph 2 stops at the claim. Drop in one concrete example (who / what happened) and the idea will carry more weight.",
    "Your position is clear — the jump between paragraphs is the weak spot. One contrast sentence at the start of para 2 usually fixes it.",
    "I'd tighten the topic sentence and cut the filler around it. Examiners reward a clean point more than a fancy word.",
    "Grammar is fine; the band lift is in Task Response — finish the idea before you start the next one.",
]

HELPFUL_REPLY_EXAMPLE = HELPFUL_REPLY_FALLBACKS[0]

# Phrases that make drafts sound like generic AI
AI_BANNED_PHRASES = [
    "as an ai",
    "as a language model",
    "delve",
    "delve into",
    "landscape",
    "it's important to note",
    "it is important to note",
    "leverage",
    "in today's world",
    "in conclusion,",
    "furthermore,",
    "moreover,",
    "navigate the",
    "unlock your potential",
    "game-changer",
    "game changer",
    "here's a comprehensive",
    "i hope this helps!",
    "certainly!",
    "absolutely!",
    "great question!",
]

# ---------------------------------------------------------------------------
# §3 Cadence & §8 KPIs
# ---------------------------------------------------------------------------

# Soft KPI for scorecard; weekly engage size follows filtered discovery (≤ ENGAGE_MAX)
KPI_REPLIES = 400
KPI_POSTS = 12
KPI_HIGH_INTENT = 10
# Free-time onboarding (cold start) engage pack — separate from weekly pending
ONBOARDING_ENGAGE_TARGET = 100
# Share of weekly engage drafts that should include soft CTA + disclosure + UTM
CTA_ENGAGE_SHARE = 0.22
# Hard safety cap so a huge discovery week doesn't explode LLM cost
ENGAGE_MAX = 500
# Default engage target when caller doesn't pass discovery size (legacy)
ENGAGE_TARGET = ENGAGE_MAX
FRESH_LISTEN_CAP = 12

TIER1 = ("reddit", "quora", "twitter")
TIER2 = ("youtube", "instagram", "tiktok")
TIER3 = ("linkedin", "facebook")

CREATE_TARGETS = {
    "reddit": 1,
    "quora": 4,
    "twitter": 5,
    "youtube": 4,  # Short scripts (repurposed to IG/TikTok)
    "instagram": 4,  # captions + stories aligned with shorts
    "tiktok": 4,
    "linkedin": 2,
    "facebook": 2,
}

HOOKS = [
    "This Band 6 sentence is why you're stuck at 6.5.",
    "Task Response isn't grammar — here's the real issue.",
    "12 better alternatives to 'increased' for Task 1.",
    "Formal vs semi-formal GT letters in 30 seconds.",
]

BRAND_NAVY = "#1a1f36"
BRAND_BLUE = "#3B82F6"

HASHTAG_DEFAULT = [
    "#IELTS",
    "#IELTSWriting",
    "#Task2",
    "#Band7",
    "#StudyAbroad",
]

PLAYBOOK_REMEMBER = (
    "Value first. Disclose when you promote. No guarantees. Teach so well that "
    "students ask for the tool — then convert with one clear link to ieltsgrader.com."
)

WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
ENGAGE_SLOT_DAYS = ("Tue", "Wed", "Thu")
DEEP_DAY = "Fri"
CREATE_SHORT_DAYS = ("Tue", "Wed", "Thu", "Fri")


def pick_soft_cta() -> str:
    import random

    return random.choice(SOFT_CTA_POOL)


def pick_helpful_fallback() -> str:
    import random

    tip = random.choice(HELPFUL_REPLY_FALLBACKS)
    return tip + "\n\nIf you paste one paragraph, I can point at the highest-impact fix."


def warmup_enabled() -> bool:
    return os.getenv("SOCIAL_WARMUP", "0").strip() in ("1", "true", "True", "yes")


def agent_tz() -> str:
    return os.getenv("SOCIAL_AGENT_TZ", "America/New_York").strip() or "America/New_York"


def agent_model() -> str:
    return os.getenv("SOCIAL_AGENT_MODEL", "gpt-4.1-mini").strip() or "gpt-4.1-mini"


def utm_url(base: str, platform: str, campaign: str = "organic_reply") -> str:
    """Append UTM params to an approved base URL."""
    if base.rstrip("/") not in {u.rstrip("/") for u in APPROVED_URLS}:
        base = SITE
    parts = urlparse(base)
    q = parse_qs(parts.query)
    q["utm_source"] = [platform]
    q["utm_medium"] = ["social"]
    q["utm_campaign"] = [campaign]
    flat = [(k, v[0]) for k, v in q.items()]
    return urlunparse(
        (parts.scheme, parts.netloc, parts.path, parts.params, urlencode(flat), parts.fragment)
    )


def classify_intent(title: str, snippet: str) -> str:
    text = f"{title} {snippet}".lower()
    tool_keys = (
        "tool",
        "checker",
        "tutor",
        "ai",
        "app",
        "software",
        "grader",
        "feedback tool",
        "essay check",
    )
    feedback_keys = (
        "grade my",
        "check my",
        "feedback",
        "stuck at",
        "band 6",
        "band 6.5",
        "review my",
        "correct my",
        "mark my",
    )
    if any(k in text for k in tool_keys) and any(
        k in text for k in ("ielts", "essay", "writing", "band")
    ):
        # tool ask if explicitly seeking a tool/tutor
        if any(
            k in text
            for k in ("recommend", "which", "best", "looking for", "anyone use", "tool", "app", "checker", "tutor")
        ):
            return "tool_ask"
    if any(k in text for k in feedback_keys):
        return "feedback_ask"
    if "competitor" in text or "chatgpt" in text:
        return "competitor"
    return "general_tip"


def is_high_intent(intent: str) -> bool:
    return intent in ("tool_ask", "feedback_ask")


def platform_tier(platform: str) -> int:
    p = (platform or "").lower()
    if p in TIER1:
        return 1
    if p in TIER2:
        return 2
    return 3


def ranking_score(
    *,
    platform: str,
    engagement_score: str,
    intent: str,
    title: str = "",
    snippet: str = "",
) -> float:
    try:
        eng = float(engagement_score) if engagement_score else 0.0
    except ValueError:
        eng = 0.0
    if eng < 0:
        eng = 0.0
    # Serper unknown → small base so they still surface
    if not engagement_score or engagement_score == "":
        eng = 5.0

    tier = platform_tier(platform)
    tier_boost = {1: 40.0, 2: 15.0, 3: 5.0}.get(tier, 0.0)
    intent_boost = {
        "tool_ask": 50.0,
        "feedback_ask": 45.0,
        "competitor": 10.0,
        "general_tip": 5.0,
    }.get(intent, 0.0)
    text = f"{title} {snippet}".lower()
    phrase_boost = 0.0
    if "grade my" in text:
        phrase_boost += 25.0
    if "stuck at" in text:
        phrase_boost += 20.0
    return eng + tier_boost + intent_boost + phrase_boost


def link_placement(platform: str, intent: str, *, is_own_post: bool = False) -> str:
    """Return link placement instruction per playbook §2."""
    p = platform.lower()
    warmup = warmup_enabled()
    if warmup and p in ("reddit", "facebook"):
        return "none (warmup — value only, no product link)"
    if is_own_post:
        if p in ("instagram", "tiktok"):
            return "bio + pinned comment"
        if p == "youtube":
            return "description + pinned comment"
        return "bio + description / pinned comment"
    if intent == "tool_ask":
        if p == "reddit":
            return "bio/profile preferred; one URL + disclosure only if sub allows"
        return "one URL + disclosure"
    if p in ("instagram", "tiktok"):
        return "link in bio only — say 'link in bio'"
    return "none — teach; offer more help"


def allow_product_mention(platform: str, intent: str) -> bool:
    if warmup_enabled() and platform.lower() in ("reddit", "facebook"):
        return False
    return intent == "tool_ask"


def allow_cta_for_item(
    platform: str,
    intent: str,
    *,
    cta_ok: bool = False,
    force_cta: bool = False,
) -> bool:
    """CTA eligibility for quota fill: tool_ask, or approved feedback_ask."""
    if warmup_enabled() and platform.lower() in ("reddit", "facebook"):
        return False
    if force_cta and intent in ("tool_ask", "feedback_ask"):
        return True
    if intent == "tool_ask":
        return True
    if intent == "feedback_ask" and cta_ok:
        return True
    return False


def validate_draft(text: str, *, product_mentioned: bool) -> list[str]:
    """Return list of problems (empty = ok)."""
    issues: list[str] = []
    lower = text.lower()
    for phrase in NEVER_SAY:
        if phrase in lower:
            issues.append(f"banned phrase: {phrase}")
    for phrase in AI_BANNED_PHRASES:
        if phrase in lower:
            issues.append(f"AI-sounding phrase: {phrase}")
    if product_mentioned:
        if "disclosure" not in lower and "affiliated" not in lower:
            issues.append("product mentioned but disclosure missing")
    # Any non-allowlisted http links
    for match in re.findall(r"https?://[^\s\)\]]+", text):
        clean = match.rstrip(".,;")
        base = clean.split("?")[0].rstrip("/")
        approved_bases = {u.rstrip("/") for u in APPROVED_URLS}
        if base not in approved_bases and "ieltsgrader.com" not in base:
            issues.append(f"non-allowlisted URL: {clean}")
    return issues


def system_prompt_engage(platform: str, intent: str) -> str:
    product_ok = allow_product_mention(platform, intent)
    placement = link_placement(platform, intent)
    return f"""You write casual social replies for IELTSGRADER. Sound like a helpful human tutor on Reddit/Quora/X — not a chatbot.

Voice rules (strict):
- Short uneven sentences. Contractionsions OK. No corporate polish.
- ONE concrete tip tied to their post. Skip criterion laundry lists (don't recite TR/CC/LR/GRA unless one name helps).
- No "As an AI", "Great question!", "Certainly!", "delve", "leverage", "it's important to note".
- Don't mirror a Hook→Problem→Fix template. Don't end every reply the same way.
- Vary length: sometimes 2 sentences, sometimes a short paragraph. Never essay-length.
- Never guarantee bands. Never argue with examiners or competitors.

Product rules:
- Soft product mention ONLY if they asked for tools/tutors/checkers (intent allows).
- At most one allowlisted link where placement allows. Disclose when promoting.
- If product not allowed: teach only — zero URLs, zero brand names.

Disclosure when promoting: {DISCLOSURE}
Example soft CTA style (paraphrase, don't copy verbatim): {SOFT_CTA}

Platform: {platform}
Intent: {intent}
Product mention allowed: {product_ok}
Link placement: {placement}
Warmup mode: {warmup_enabled()}

Never say: {", ".join(NEVER_SAY)}.

Output ONLY the reply text to paste. No markdown headings. No "Step 1". No meta commentary.
"""


def system_prompt_create(platform: str, content_type: str) -> str:
    return f"""You write social posts for IELTSGRADER that sound human — like a sharp tutor, not an ad agency or ChatGPT.

Voice:
- Punchy, specific, a little uneven. Real essay examples beat slogans.
- Avoid AI filler: delve, leverage, landscape, "in today's world", "unlock your potential".
- Don't force a rigid Hook→Problem→Fix→CTA every time; mix formats.
- Hashtags only where natural (skip on LinkedIn).

Positioning (use lightly): {POSITIONING}
Hook ideas (optional spark, rewrite in your own words): {HOOKS}
Visual cue when relevant: vertical 9:16; overlays {BRAND_NAVY} + {BRAND_BLUE}.
Banned claims: {NEVER_SAY}. Replacements: {BANNED_PHRASE_REPLACEMENTS}.

Platform: {platform}
Content type: {content_type}
Instagram/TikTok: "link in bio", no raw URLs in caption.
YouTube: spoken CTA OK; description may include ieltsgrader.com.
Disclose if product is mentioned: {DISCLOSURE}

Output paste-ready copy only (or a short script with on-screen cues). No meta commentary.
"""
