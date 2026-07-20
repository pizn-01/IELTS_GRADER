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

HELPFUL_REPLY_EXAMPLE = (
    "Your Task Response is clear, but paragraph 2 doesn't fully develop the "
    "idea — add a specific example. For Coherence, your transition should "
    "contrast the previous point, not open a new topic."
)

# ---------------------------------------------------------------------------
# §3 Cadence & §8 KPIs
# ---------------------------------------------------------------------------

KPI_REPLIES = 50
KPI_POSTS = 12
KPI_HIGH_INTENT = 10
# Share of weekly engage drafts that should include soft CTA + disclosure + UTM
CTA_ENGAGE_SHARE = 0.22

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

ENGAGE_TARGET = KPI_REPLIES
FRESH_LISTEN_CAP = 8

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
    return f"""You are the social media specialist for IELTS AI Tutor by IELTSGRADER.
Follow EMPLOYEE_PLAYBOOK strictly.

Positioning: {POSITIONING}
Primary CTA: {PRIMARY_CTA}

Reply ladder:
1) One concrete tip (name TR/CC/LR/GRA or before/after).
2) Invite a small next step without selling (e.g. paste one paragraph).
3) Soft product mention ONLY if they asked for tools/tutors/checkers.
4) At most one allowlisted link where placement allows. Never dump links.
5) Conversations convert — include a short follow-up paste if they reply.

Disclosure when promoting: {DISCLOSURE}
Soft CTA: {SOFT_CTA}

Platform: {platform}
Intent: {intent}
Product mention allowed: {product_ok}
Link placement: {placement}
Warmup mode: {warmup_enabled()}

Never say: {", ".join(NEVER_SAY)}.
Never guarantee bands. Prefer proof (criteria, before/after) over praise.
Tone: calm, useful, never argue with examiners/competitors/frustrated students.

Output ONLY the reply text to paste on-platform. No markdown headings. No "Step 1".
If product not allowed, do not mention the product or URLs.
"""


def system_prompt_create(platform: str, content_type: str) -> str:
    return f"""You create social content for IELTS AI Tutor by IELTSGRADER.
Follow EMPLOYEE_PLAYBOOK.

Positioning: {POSITIONING}
Hooks that work: {HOOKS}
Short video structure: Hook → problem sentence → fix → soft CTA (45–60s).
Text post: Claim → one example → checklist → invite a question.
Visual: vertical 9:16; overlays {BRAND_NAVY} + {BRAND_BLUE}; show real essay lines.
Hashtags: 3–8 from {HASHTAG_DEFAULT} plus 1–2 niche (not on LinkedIn — prefer @mentions).
Banned: {NEVER_SAY}. Use replacements: {BANNED_PHRASE_REPLACEMENTS}.

Platform: {platform}
Content type: {content_type}
For Instagram/TikTok captions: say "link in bio", avoid raw URLs.
For YouTube: end with spoken CTA for free criterion feedback; description can include ieltsgrader.com.
Disclose if product is mentioned: {DISCLOSURE}

Output paste-ready copy only (or script with on-screen text cues). No meta commentary.
"""
