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
    "Value first. Reddit and LinkedIn comments never carry product links — "
    "convert via Quora/YouTube/bios and profile Website. Disclose when you "
    "promote on allowed platforms. No guarantees. Teach so well students "
    "find IELTSGRADER on branded channels."
)

WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
ENGAGE_SLOT_DAYS = ("Tue", "Wed", "Thu")
DEEP_DAY = "Fri"
CREATE_SHORT_DAYS = ("Tue", "Wed", "Thu", "Fri")

# Soft CTAs only on these engage platforms (~CTA_ENGAGE_SHARE of eligible)
CTA_PLATFORMS = frozenset({"quora", "twitter", "youtube"})
NO_PRODUCT_ENGAGE_PLATFORMS = frozenset({"reddit", "linkedin"})
REDDIT_STRICT_SUBS = frozenset({"ielts", "englishlearning"})

BRAND_TOKENS_WHEN_NO_PRODUCT = [
    "ieltsgrader",
    "ielts grader",
    "ielts ai tutor",
    "free evaluation",
    "full disclosure",
    "i'm affiliated",
    "i am affiliated",
    "im affiliated",
]


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


def parse_subreddit(url: str = "", notes: str = "") -> str:
    """Return lowercase subreddit name without r/ prefix, or empty."""
    blob = f"{url} {notes}"
    m = re.search(r"(?:reddit\.com/r/|subreddit=r/)([a-zA-Z0-9_]+)", blob, re.I)
    if m:
        return m.group(1).lower()
    m2 = re.search(r"\br/([a-zA-Z0-9_]+)\b", blob)
    if m2:
        return m2.group(1).lower()
    return ""


def is_linkedin_competitor_promo(title: str, snippet: str) -> bool:
    """True when the post looks like rival AI-tool marketing (skip engage)."""
    text = f"{title} {snippet}".lower()
    marketing = (
        "ai-powered",
        "ai powered",
        "essay checker",
        "band score estimation",
        "instant feedback",
        "try our",
        "check out our",
        "sign up",
        "free trial",
        "lnkd.in/",
    )
    ieltsish = any(k in text for k in ("ielts", "writing task", "task 1", "task 2"))
    hits = sum(1 for k in marketing if k in text)
    return ieltsish and hits >= 2


def link_placement(platform: str, intent: str, *, is_own_post: bool = False) -> str:
    """Return link placement instruction per ban-safe playbook."""
    p = platform.lower()
    if not is_own_post and p in NO_PRODUCT_ENGAGE_PLATFORMS:
        return "none — teach only; never link, brand, or disclosure"
    warmup = warmup_enabled()
    if warmup and p == "facebook" and not is_own_post:
        return "none (warmup — value only, no product link)"
    if is_own_post:
        if p in ("instagram", "tiktok"):
            return "bio + pinned comment"
        if p == "youtube":
            return "description + pinned comment"
        if p == "linkedin":
            return "profile Website/Featured only — no raw URL in post body"
        return "bio + description / pinned comment"
    if p not in CTA_PLATFORMS:
        if p in ("instagram", "tiktok"):
            return "link in bio only — say 'link in bio'"
        return "none — teach; offer more help"
    if intent == "tool_ask":
        return "one URL + disclosure"
    if p in ("instagram", "tiktok"):
        return "link in bio only — say 'link in bio'"
    return "none — teach; offer more help"


def allow_product_mention(platform: str, intent: str) -> bool:
    p = (platform or "").lower()
    if p in NO_PRODUCT_ENGAGE_PLATFORMS:
        return False
    if warmup_enabled() and p == "facebook":
        return False
    if p not in CTA_PLATFORMS:
        return False
    return intent == "tool_ask"


def allow_cta_for_item(
    platform: str,
    intent: str,
    *,
    cta_ok: bool = False,
    force_cta: bool = False,
) -> bool:
    """CTA eligibility: Quora/X/YouTube only; never Reddit/LinkedIn engages."""
    p = (platform or "").lower()
    if p in NO_PRODUCT_ENGAGE_PLATFORMS:
        return False
    if warmup_enabled() and p == "facebook":
        return False
    if p not in CTA_PLATFORMS:
        return False
    if force_cta and intent in ("tool_ask", "feedback_ask"):
        return True
    if intent == "tool_ask":
        return True
    if intent == "feedback_ask" and cta_ok:
        return True
    return False


def strip_brand_from_text(text: str) -> str:
    """Remove product/disclosure/URLs from a no-CTA draft."""
    out = text or ""
    out = re.sub(
        r"(?i)full disclosure:.*?ieltsgrader\.com\)?\s*",
        "",
        out,
    )
    out = re.sub(r"(?i)https?://\S*ieltsgrader\.com\S*", "", out)
    out = re.sub(r"(?i)\bieltsgrader\.com\b", "", out)
    out = re.sub(r"(?i)\bielts\s*ai\s*tutor\b", "", out)
    out = re.sub(r"(?i)\bieltsgrader\b", "", out)
    out = re.sub(r"\n{3,}", "\n\n", out).strip()
    return out


def validate_draft(
    text: str,
    *,
    product_mentioned: bool,
    already_posted_essay: bool = False,
) -> list[str]:
    """Return list of problems (empty = ok)."""
    issues: list[str] = []
    lower = text.lower()
    if already_posted_essay and any(
        p in lower
        for p in (
            "paste one paragraph",
            "paste a paragraph",
            "share a paragraph",
            "if you paste",
            "paste your essay",
            "paste the essay",
        )
    ):
        issues.append("asks to paste essay/paragraph though OP already posted it")
    if re.search(
        r"quick tip for (?:ielts )?(?:academic )?task\s*2",
        lower,
    ) and "lawbreak" not in lower and "prison" not in lower:
        if not any(
            k in lower
            for k in ("your", "you wrote", "your essay", "your intro", "your prompt")
        ):
            issues.append("generic task-2 tip without referencing their post")
    for phrase in NEVER_SAY:
        if phrase in lower:
            issues.append(f"banned phrase: {phrase}")
    for phrase in AI_BANNED_PHRASES:
        if phrase in lower:
            issues.append(f"AI-sounding phrase: {phrase}")
    if product_mentioned:
        if "disclosure" not in lower and "affiliated" not in lower:
            issues.append("product mentioned but disclosure missing")
    else:
        for token in BRAND_TOKENS_WHEN_NO_PRODUCT:
            if token in lower:
                issues.append(f"brand/promo token while product not allowed: {token}")
        if re.search(r"https?://", text):
            issues.append("URL present while product not allowed")
        if "ieltsgrader.com" in lower:
            issues.append("ieltsgrader.com while product not allowed")
    # Any non-allowlisted http links (when product allowed)
    if product_mentioned:
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
    p = (platform or "").lower()
    persona = (
        "You write casual social replies as an experienced human IELTS writing tutor. "
        "You are NOT representing a product unless Product mention allowed = true."
        if not product_ok
        else "You write casual social replies for IELTSGRADER. Sound like a helpful human tutor — not a chatbot."
    )
    reddit_extra = ""
    if p == "reddit":
        reddit_extra = """
Reddit hard rules:
- ZERO URLs, ZERO brand names (no ieltsgrader, no IELTS AI Tutor), ZERO disclosure.
- If they ask for a tool/checker/AI: refuse to recommend AI checkers (sub rules). Give one human TR/CC tip or point to official band descriptors only.
"""
    linkedin_extra = ""
    if p == "linkedin":
        linkedin_extra = """
LinkedIn hard rules:
- ZERO URLs, ZERO brand names, ZERO disclosure, ZERO soft CTAs in comments.
- Short professional insight only. Do not pitch against other AI tools' posts.
"""
    product_block = (
        f"""Product rules:
- Soft product mention ONLY if Product mention allowed is true.
- At most one allowlisted link where placement allows. Disclose when promoting.
- Disclosure when promoting: {DISCLOSURE}
- Example soft CTA style (paraphrase, don't copy verbatim): {SOFT_CTA}
"""
        if product_ok
        else """Product rules:
- Product NOT allowed. Teach only — zero URLs, zero brand names, zero disclosure, zero soft CTAs.
"""
    )
    return f"""{persona}

Thread-specificity rules (strict — most important):
- Your reply MUST be about THIS thread only. Use the Title, Snippet, and Extra context.
- Name something concrete from their post (prompt topic, a claim they made, a wording issue, a structure problem).
- If Extra context includes their essay/prompt: comment on THAT text. Never invent a generic "quick tip for Task 2".
- If they already posted an essay or asked "grade/check my essay": do NOT ask them to paste a paragraph.
- If Extra context is missing/thin: do NOT fake specific feedback. Acknowledge their ask from the title and help with what you actually have. Never invent essay details.
- Never invent the OP's band score, exam result, or biography. Only mention scores if Extra context explicitly says they claimed them.

Voice rules (strict):
- Short uneven sentences. Contractionsions OK. No corporate polish.
- ONE concrete tip tied to their post. Skip criterion laundry lists (don't recite TR/CC/LR/GRA unless one name helps).
- No "As an AI", "Great question!", "Certainly!", "delve", "leverage", "it's important to note".
- Don't mirror a Hook→Problem→Fix template. Don't end every reply the same way.
- Vary length: sometimes 2 sentences, sometimes a short paragraph. Never essay-length.
- Never guarantee bands. Never argue with examiners or competitors.
{reddit_extra}{linkedin_extra}
{product_block}
Platform: {platform}
Intent: {intent}
Product mention allowed: {product_ok}
Link placement: {placement}
Warmup mode: {warmup_enabled()}

Never say: {", ".join(NEVER_SAY)}.

Output ONLY the reply text to paste. No markdown headings. No "Step 1". No meta commentary.
"""


def system_prompt_create(platform: str, content_type: str) -> str:
    p = (platform or "").lower()
    li_extra = ""
    if p == "linkedin":
        li_extra = (
            "LinkedIn: education-first. If content type includes CTA, say "
            "'link in my profile / Featured' — do NOT paste raw ieltsgrader.com "
            "or lnkd.in spam patterns in the post body.\n"
        )
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
{li_extra}Disclose if product is mentioned (except LinkedIn profile-CTA posts that must not paste raw URLs): {DISCLOSURE}

Output paste-ready copy only (or a short script with on-screen cues). No meta commentary.
"""
