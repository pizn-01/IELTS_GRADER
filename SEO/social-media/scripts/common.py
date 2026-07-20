"""
Shared helpers for IELTS social discovery scripts.

Data sources:
  - Reddit: public JSON search (optional OAuth for higher limits)
  - YouTube: Data API v3
  - Facebook, Instagram, Quora, Twitter/X, LinkedIn, TikTok: Serper web search

Never auto-posts or auto-replies — discovery / listening only.
"""

from __future__ import annotations

import csv
import os
import time
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable, Optional

import requests
from dotenv import load_dotenv

SCRIPTS_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPTS_DIR.parent / "output"
load_dotenv(SCRIPTS_DIR / ".env")

PLATFORMS = [
    "facebook",
    "instagram",
    "reddit",
    "quora",
    "twitter",
    "linkedin",
    "tiktok",
    "youtube",
]

# Platforms covered via Serper site: queries (Reddit/YouTube also use native APIs)
SERPER_SITE = {
    "facebook": "facebook.com",
    "instagram": "instagram.com",
    "quora": "quora.com",
    "twitter": "x.com OR site:twitter.com",
    "linkedin": "linkedin.com",
    "tiktok": "tiktok.com",
    # Extra indexed coverage for Reddit/YouTube via SERP fallback if needed
    "reddit": "reddit.com",
    "youtube": "youtube.com",
}

CSV_FIELDS = [
    "platform",
    "url",
    "title",
    "snippet",
    "published_at",
    "discovered_at",
    "author",
    "engagement_score",
    "views",
    "likes",
    "comments",
    "query",
    "source",
    "notes",
]

QUERY_BANK = [
    "IELTS essay checker",
    "IELTS writing feedback",
    "IELTS band score AI",
    "IELTS writing tutor",
    "IELTS essay grading",
    "IELTS AI tutor",
    "IELTS writing practice feedback",
    "IELTS Task 2 checker",
    "IELTS mock writing test",
    "grade my IELTS essay",
    "IELTS writing band score tool",
    "IELTS essay correction",
]

# Extra phrases for cold-start / historical listening (Serper top-slice expansion)
QUERY_BANK_HISTORICAL_EXTRA = [
    "stuck at 6.5 IELTS writing",
    "IELTS Task Response band 7",
    "IELTS coherence cohesion tips",
    "check my IELTS Task 2",
    "IELTS writing examiner feedback",
    "best AI for IELTS writing",
    "IELTS Academic writing feedback free",
    "IELTS GT letter feedback",
]

USER_AGENT = os.getenv(
    "REDDIT_USER_AGENT",
    "IELTSGRADER-social-discovery/1.0 (listening script; contact ieltsgrader.com)",
)


@dataclass
class ResultRow:
    platform: str
    url: str
    title: str = ""
    snippet: str = ""
    published_at: str = ""
    discovered_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    author: str = ""
    engagement_score: str = ""
    views: str = ""
    likes: str = ""
    comments: str = ""
    query: str = ""
    source: str = ""
    notes: str = ""

    def sort_key(self) -> float:
        try:
            return float(self.engagement_score) if self.engagement_score else -1.0
        except ValueError:
            return -1.0


def parse_date_arg(value: Optional[str]) -> date:
    if not value:
        return date.today()
    return date.fromisoformat(value)


def window_bounds(end: date, days: int) -> tuple[datetime, datetime]:
    """Inclusive start of window, exclusive end-of-day after `end`."""
    end_dt = datetime.combine(end, datetime.max.time()).replace(tzinfo=timezone.utc)
    start_dt = datetime.combine(
        end - timedelta(days=days - 1), datetime.min.time()
    ).replace(tzinfo=timezone.utc)
    return start_dt, end_dt


def after_before_for_serper(start: datetime, end: datetime) -> str:
    """Serper supports after:YYYY-MM-DD before:YYYY-MM-DD in q."""
    return f"after:{start.date().isoformat()} before:{(end.date() + timedelta(days=1)).isoformat()}"


def normalize_url(url: str) -> str:
    return (url or "").strip().split("#")[0].rstrip("/")


def dedupe_rows(rows: Iterable[ResultRow]) -> list[ResultRow]:
    seen: dict[str, ResultRow] = {}
    for row in rows:
        key = normalize_url(row.url).lower()
        if not key:
            continue
        existing = seen.get(key)
        if existing is None or row.sort_key() > existing.sort_key():
            seen[key] = row
    ordered = list(seen.values())
    ordered.sort(key=lambda r: (r.sort_key(), r.published_at or ""), reverse=True)
    return ordered


def write_csv(path: Path, rows: list[ResultRow]) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))
    return path


def _sleep(seconds: float = 0.35) -> None:
    time.sleep(seconds)


# ---------------------------------------------------------------------------
# Serper
# ---------------------------------------------------------------------------


def serper_search(
    query: str,
    *,
    num: int = 10,
    tbs: Optional[str] = None,
) -> list[dict]:
    api_key = os.getenv("SERPER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "SERPER_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    # Serper free/standard plans reject num > 10 (HTTP 400).
    payload: dict = {"q": query, "num": max(1, min(int(num), 10))}
    if tbs:
        payload["tbs"] = tbs
    resp = requests.post(
        "https://google.serper.dev/search",
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        json=payload,
        timeout=45,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("organic") or []


def search_platform_serper(
    platform: str,
    query: str,
    *,
    start: datetime,
    end: datetime,
    num: int = 10,
    use_dates: bool = True,
) -> list[ResultRow]:
    site = SERPER_SITE.get(platform)
    if not site:
        return []
    date_q = after_before_for_serper(start, end) if use_dates else ""
    # twitter uses OR in site expression already
    if platform == "twitter":
        full_q = f"({site}) {query} {date_q}".strip()
    else:
        full_q = f"site:{site} {query} {date_q}".strip()
    organic = serper_search(full_q, num=num)
    _sleep()
    rows: list[ResultRow] = []
    for item in organic:
        link = item.get("link") or ""
        if not link:
            continue
        rows.append(
            ResultRow(
                platform=platform,
                url=link,
                title=item.get("title") or "",
                snippet=item.get("snippet") or "",
                published_at=item.get("date") or "",
                query=query,
                source="serper" if use_dates else "serper_no_date",
                notes="engagement_unknown",
                engagement_score="",
            )
        )
    return rows


def search_platform_serper_priority(
    platform: str,
    query: str,
    *,
    start: datetime,
    end: datetime,
    num: int = 10,
    prefer_undated: bool = False,
    allow_undated_fallback: bool = True,
) -> list[ResultRow]:
    """Serper with optional undated pass — Quora/Reddit are thin in short after: windows.

    prefer_undated: for long historical windows, try undated first (Google's multi-year
    after: is weak). allow_undated_fallback: weekly may only undate as last resort.
    """
    n = max(1, min(int(num), 10))
    rows: list[ResultRow] = []
    if prefer_undated and platform in ("reddit", "quora"):
        rows = search_platform_serper(
            platform, query, start=start, end=end, num=n, use_dates=False
        )
        if len(rows) >= 2:
            return rows
        dated = search_platform_serper(
            platform, query, start=start, end=end, num=n, use_dates=True
        )
        seen = {normalize_url(r.url).lower() for r in rows}
        for r in dated:
            key = normalize_url(r.url).lower()
            if key and key not in seen:
                rows.append(r)
                seen.add(key)
        return rows

    rows = search_platform_serper(
        platform, query, start=start, end=end, num=n, use_dates=True
    )
    if len(rows) >= 2 or platform not in ("reddit", "quora", "linkedin"):
        return rows
    if not allow_undated_fallback:
        return rows
    extra = search_platform_serper(
        platform, query, start=start, end=end, num=n, use_dates=False
    )
    seen = {normalize_url(r.url).lower() for r in rows}
    for r in extra:
        key = normalize_url(r.url).lower()
        if key and key not in seen:
            rows.append(r)
            seen.add(key)
    return rows


# ---------------------------------------------------------------------------
# Reddit (public JSON)
# ---------------------------------------------------------------------------


def _reddit_headers() -> dict:
    return {"User-Agent": USER_AGENT}


def search_reddit(
    query: str,
    *,
    start: datetime,
    end: datetime,
    limit: int = 50,
) -> list[ResultRow]:
    """Search Reddit submissions via public search JSON; filter by created_utc."""
    url = "https://www.reddit.com/search.json"
    params = {
        "q": query,
        "sort": "top",
        "t": "all",
        "limit": min(limit, 100),
        "type": "link",
    }
    resp = requests.get(url, params=params, headers=_reddit_headers(), timeout=45)
    if resp.status_code == 429:
        _sleep(2.0)
        resp = requests.get(url, params=params, headers=_reddit_headers(), timeout=45)
    resp.raise_for_status()
    children = (resp.json().get("data") or {}).get("children") or []
    _sleep(0.6)
    rows: list[ResultRow] = []
    start_ts = start.timestamp()
    end_ts = end.timestamp()
    for child in children:
        data = child.get("data") or {}
        created = float(data.get("created_utc") or 0)
        if created < start_ts or created > end_ts:
            continue
        permalink = data.get("permalink") or ""
        full_url = (
            f"https://www.reddit.com{permalink}"
            if permalink.startswith("/")
            else (data.get("url") or "")
        )
        score = int(data.get("score") or 0)
        num_comments = int(data.get("num_comments") or 0)
        engagement = score + (num_comments * 2)
        published = datetime.fromtimestamp(created, tz=timezone.utc).isoformat()
        rows.append(
            ResultRow(
                platform="reddit",
                url=full_url,
                title=data.get("title") or "",
                snippet=(data.get("selftext") or "")[:400],
                published_at=published,
                author=data.get("author") or "",
                engagement_score=str(engagement),
                views="",
                likes=str(score),
                comments=str(num_comments),
                query=query,
                source="reddit_public_json",
                notes=f"subreddit=r/{data.get('subreddit') or ''}",
            )
        )
    return rows


# ---------------------------------------------------------------------------
# YouTube Data API
# ---------------------------------------------------------------------------


def search_youtube(
    query: str,
    *,
    start: datetime,
    end: datetime,
    max_results: int = 25,
) -> list[ResultRow]:
    api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "YOUTUBE_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    search_url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "order": "viewCount",
        "publishedAfter": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "publishedBefore": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "maxResults": min(max_results, 50),
        "key": api_key,
    }
    resp = requests.get(search_url, params=params, timeout=45)
    resp.raise_for_status()
    items = resp.json().get("items") or []
    _sleep(0.25)
    video_ids = [
        (it.get("id") or {}).get("videoId")
        for it in items
        if (it.get("id") or {}).get("videoId")
    ]
    stats_by_id: dict[str, dict] = {}
    if video_ids:
        stats_url = "https://www.googleapis.com/youtube/v3/videos"
        stats_resp = requests.get(
            stats_url,
            params={
                "part": "statistics,snippet",
                "id": ",".join(video_ids),
                "key": api_key,
            },
            timeout=45,
        )
        stats_resp.raise_for_status()
        for v in stats_resp.json().get("items") or []:
            stats_by_id[v["id"]] = v
        _sleep(0.25)

    rows: list[ResultRow] = []
    for it in items:
        vid = (it.get("id") or {}).get("videoId")
        if not vid:
            continue
        sn = it.get("snippet") or {}
        detail = stats_by_id.get(vid) or {}
        st = detail.get("statistics") or {}
        views = int(st.get("viewCount") or 0)
        likes = int(st.get("likeCount") or 0)
        comments = int(st.get("commentCount") or 0)
        engagement = views + (likes * 10) + (comments * 20)
        published = sn.get("publishedAt") or ""
        rows.append(
            ResultRow(
                platform="youtube",
                url=f"https://www.youtube.com/watch?v={vid}",
                title=sn.get("title") or "",
                snippet=sn.get("description") or "",
                published_at=published,
                author=sn.get("channelTitle") or "",
                engagement_score=str(engagement),
                views=str(views),
                likes=str(likes),
                comments=str(comments),
                query=query,
                source="youtube_data_api",
                notes="",
            )
        )
    return rows


# ---------------------------------------------------------------------------
# Orchestration helpers
# ---------------------------------------------------------------------------


def collect_all_platforms(
    *,
    start: datetime,
    end: datetime,
    queries: Optional[list[str]] = None,
    platforms: Optional[list[str]] = None,
    serper_num: int = 8,
    reddit_limit: int = 40,
    youtube_max: int = 15,
    dry_run: bool = False,
    prefer_undated: bool = False,
    allow_undated_fallback: bool = True,
) -> list[ResultRow]:
    queries = queries or QUERY_BANK
    platforms = platforms or PLATFORMS
    all_rows: list[ResultRow] = []
    errors: list[str] = []

    if dry_run:
        samples = [
            ("reddit", "grade my IELTS essay stuck at 6.5", "Please check my Task 2"),
            ("reddit", "IELTS writing feedback needed", "How do I improve coherence?"),
            ("quora", "How can I check my IELTS essay?", "Looking for feedback tools"),
            ("quora", "Best IELTS writing tutor?", "AI vs human"),
            ("twitter", "stuck at band 6.5 writing", "Any tips for Task Response?"),
            ("twitter", "IELTS Task 2 structure", "Share your outlines"),
            ("youtube", "IELTS essay checker review", "Does AI feedback work?"),
            ("linkedin", "AI feedback for IELTS students", "Parents asking about tools"),
            ("facebook", "IELTS GT letter help", "Formal vs semi-formal"),
            ("instagram", "Band 7 writing tips", "Save this carousel"),
            ("tiktok", "IELTS writing mistake", "This sentence costs bands"),
        ]
        # Expand toward engage target with variants
        for i in range(max(len(platforms), 40)):
            plat, title, snip = samples[i % len(samples)]
            if platforms and plat not in platforms and i < len(platforms):
                plat = platforms[i % len(platforms)]
            all_rows.append(
                ResultRow(
                    platform=plat,
                    url=f"https://example.com/dry-run/{plat}/{i}",
                    title=f"[dry-run] {title} #{i+1}",
                    snippet=snip,
                    published_at=start.isoformat(),
                    query=queries[0] if queries else "",
                    source="dry_run",
                    notes="dry_run",
                    engagement_score=str(200 - i),
                )
            )
        return dedupe_rows(all_rows)

    from collections import Counter
    import json as _json

    native_reddit = "reddit" in platforms
    native_youtube = "youtube" in platforms
    youtube_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    # Prefer Quora early (Serper); Reddit handled separately below.
    preferred = ["quora", "twitter", "linkedin", "youtube", "instagram", "tiktok", "facebook"]
    serper_platforms = [p for p in preferred if p in platforms and p in SERPER_SITE]
    serper_platforms += [
        p for p in platforms if p in SERPER_SITE and p not in serper_platforms and p != "reddit"
    ]

    # YouTube Data API is optional — skip quietly; Serper can still find YT pages.
    if native_youtube and not youtube_key:
        print(
            "YouTube API: skipped (no YOUTUBE_API_KEY) — using Serper for youtube.com results",
            flush=True,
        )
        native_youtube = False

    # Reddit public JSON is often 403 from cloud/datacenter IPs (e.g. Fly).
    # Fall back to Serper site:reddit.com after first block.
    reddit_via = "native" if native_reddit else None
    reddit_fallback_announced = False
    total_q = len(queries)

    def _progress(qi: int, note: str = "") -> None:
        counts = dict(Counter(r.platform for r in all_rows))
        extra = f" {note}" if note else ""
        print(
            f"PROGRESS query={qi}/{total_q} rows={len(all_rows)} by={_json.dumps(counts, separators=(',', ':'))}{extra}",
            flush=True,
        )

    for qi, query in enumerate(queries, 1):
        print(f"PROGRESS query={qi}/{total_q} searching {query!r} …", flush=True)

        if native_reddit and reddit_via == "native":
            try:
                all_rows.extend(
                    search_reddit(query, start=start, end=end, limit=reddit_limit)
                )
            except Exception as exc:  # noqa: BLE001
                msg = str(exc)
                if "403" in msg or "Blocked" in msg or "401" in msg:
                    reddit_via = "serper"
                    if not reddit_fallback_announced:
                        print(
                            "Reddit public JSON blocked from this host — "
                            "falling back to Serper (site:reddit.com) for the rest",
                            flush=True,
                        )
                        reddit_fallback_announced = True
                else:
                    errors.append(f"reddit/{query}: {exc}")

        if native_reddit and reddit_via == "serper":
            try:
                all_rows.extend(
                    search_platform_serper_priority(
                        "reddit",
                        query,
                        start=start,
                        end=end,
                        num=serper_num,
                        prefer_undated=prefer_undated,
                        allow_undated_fallback=allow_undated_fallback,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(f"serper/reddit/{query}: {exc}")

        if native_youtube:
            try:
                all_rows.extend(
                    search_youtube(query, start=start, end=end, max_results=youtube_max)
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(f"youtube/{query}: {exc}")

        for platform in serper_platforms:
            # Reddit handled above (native or Serper fallback).
            # YouTube via Serper only when Data API is off.
            if platform == "youtube" and native_youtube:
                continue
            try:
                all_rows.extend(
                    search_platform_serper_priority(
                        platform,
                        query,
                        start=start,
                        end=end,
                        num=serper_num,
                        prefer_undated=prefer_undated,
                        allow_undated_fallback=allow_undated_fallback,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(f"serper/{platform}/{query}: {exc}")

        _progress(qi)

    if errors:
        print("Warnings / partial failures:", flush=True)
        for err in errors[:30]:
            print(f"  - {err}", flush=True)
        if len(errors) > 30:
            print(f"  … and {len(errors) - 30} more", flush=True)

    final = dedupe_rows(all_rows)
    final_counts = dict(sorted(Counter(r.platform for r in final).items()))
    print(
        f"PROGRESS done total={len(final)} by={_json.dumps(final_counts, separators=(',', ':'))}",
        flush=True,
    )
    return final


def default_output_path(prefix: str, end: date) -> Path:
    return OUTPUT_DIR / f"{prefix}_{end.isoformat().replace('-', '')}.csv"
