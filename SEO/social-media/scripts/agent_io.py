"""
Paths, STATUS, engaged memory, THIS_WEEK folder helpers for Social Ops Agent.
"""

from __future__ import annotations

import csv
import json
import os
import shutil
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional, Iterable

from dotenv import load_dotenv

SCRIPTS_DIR = Path(__file__).resolve().parent
ROOT = SCRIPTS_DIR.parent
OUTPUT_DIR = ROOT / "output"
THIS_WEEK = OUTPUT_DIR / "THIS_WEEK"
COLD_START = OUTPUT_DIR / "cold-start"
ARCHIVE_DIR = OUTPUT_DIR / "archive"
ENGAGED_PATH = OUTPUT_DIR / "engaged_urls.csv"
SEEN_PATH = OUTPUT_DIR / "seen_urls.csv"
PARENT_URL_IDS_PATH = OUTPUT_DIR / "parent_url_ids.csv"
SEEN_TTL_DAYS = 90
SCORECARDS_PATH = OUTPUT_DIR / "scorecards.csv"
WARMUP_FLAG = OUTPUT_DIR / "warmup_until.txt"

STATUS_FIELDS = [
    "id",
    "day",
    "status",
    "platform",
    "type",
    "url",
    "title",
    "intent",
    "high_intent",
    "tier",
    "action_file",
    "fresh",
    "cta",
    "reply_check",
    "week_id",
    "queued_at",
    "parent_id",
]

# Leave Today / Full pending until done or dead (skipped counts as closed)
CLOSED_STATUSES = frozenset({"done", "dead", "skipped"})
OPEN_STATUSES = frozenset({"pending", "awaiting_reply", "got_reply"})

# One STATUS id per parent thread URL (followups are children via parent_id)
PARENT_THREAD_TYPES = frozenset(
    {"reply", "comment", "engage", "answer", "group_comment"}
)


def is_open_status(status: str) -> bool:
    return (status or "").lower() in OPEN_STATUSES


def is_closed_status(status: str) -> bool:
    return (status or "").lower() in CLOSED_STATUSES


def is_parent_thread_type(typ: str) -> bool:
    return (typ or "").lower() in PARENT_THREAD_TYPES


def normalize_status_url(url: str) -> str:
    """Canonical parent-URL key: no fragment, lowercased, no trailing slash."""
    raw = (url or "").strip().split("#")[0].rstrip("/")
    return raw.lower()

load_dotenv(SCRIPTS_DIR / ".env")


def ensure_output_dirs() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    THIS_WEEK.mkdir(parents=True, exist_ok=True)
    (THIS_WEEK / "actions").mkdir(parents=True, exist_ok=True)
    (THIS_WEEK / "_meta").mkdir(parents=True, exist_ok=True)
    COLD_START.mkdir(parents=True, exist_ok=True)
    (COLD_START / "actions").mkdir(parents=True, exist_ok=True)
    (COLD_START / "_meta").mkdir(parents=True, exist_ok=True)


def status_path(*, onboarding: bool = False) -> Path:
    if onboarding:
        return COLD_START / "_meta" / "STATUS.csv"
    return THIS_WEEK / "_meta" / "STATUS.csv"


def work_root(*, onboarding: bool = False) -> Path:
    return COLD_START if onboarding else THIS_WEEK


def read_status(*, onboarding: bool = False) -> list[dict[str, str]]:
    path = status_path(onboarding=onboarding)
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r.setdefault("cta", "")
        r.setdefault("reply_check", "")
        r.setdefault("week_id", "")
        r.setdefault("queued_at", "")
        r.setdefault("parent_id", "")
        if onboarding:
            r["queue"] = "onboarding"
    return rows


def write_status(rows: list[dict[str, str]], *, onboarding: bool = False) -> None:
    """Atomic STATUS write (temp file → rename) so crashes don't corrupt the queue."""
    ensure_output_dirs()
    path = status_path(onboarding=onboarding)
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = dedupe_parent_url_rows(rows)
    tmp = path.with_suffix(".csv.tmp")
    with tmp.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=STATUS_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in STATUS_FIELDS})
    tmp.replace(path)


def dedupe_parent_url_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Keep one parent-thread row per URL (lowest numeric id wins); leave followups/create."""
    best_parent: dict[str, dict[str, str]] = {}
    others: list[dict[str, str]] = []
    for r in rows:
        typ = (r.get("type") or "").lower()
        if not is_parent_thread_type(typ):
            others.append(r)
            continue
        key = normalize_status_url(r.get("url") or "")
        if not key:
            others.append(r)
            continue
        prev = best_parent.get(key)
        if prev is None:
            best_parent[key] = r
            continue
        try:
            keep_new = int(r.get("id") or 0) < int(prev.get("id") or 0)
        except ValueError:
            keep_new = False
        if keep_new:
            best_parent[key] = r
    return sorted(
        list(best_parent.values()) + others, key=lambda x: x.get("id", "")
    )


def _parent_url_registry_path(*, onboarding: bool = False) -> Path:
    if onboarding:
        return COLD_START / "_meta" / "parent_url_ids.csv"
    return PARENT_URL_IDS_PATH


def read_parent_url_registry(*, onboarding: bool = False) -> dict[str, str]:
    """url_key → stable action id (unique parent URL identity)."""
    path = _parent_url_registry_path(onboarding=onboarding)
    mapping: dict[str, str] = {}
    if path.exists():
        with path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                key = normalize_status_url(row.get("url") or "")
                aid = (row.get("id") or "").strip()
                if key and aid and key not in mapping:
                    mapping[key] = aid
    # STATUS is source of truth for live rows — fill gaps
    for r in read_status(onboarding=onboarding):
        if not is_parent_thread_type(r.get("type") or ""):
            continue
        key = normalize_status_url(r.get("url") or "")
        aid = (r.get("id") or "").strip()
        if key and aid and key not in mapping:
            mapping[key] = aid
    return mapping


def write_parent_url_registry(
    mapping: dict[str, str], *, onboarding: bool = False
) -> None:
    ensure_output_dirs()
    path = _parent_url_registry_path(onboarding=onboarding)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".csv.tmp")
    with tmp.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["url", "id"])
        writer.writeheader()
        for url_key, aid in sorted(mapping.items(), key=lambda x: x[1]):
            writer.writerow({"url": url_key, "id": aid})
    tmp.replace(path)


def get_or_create_parent_id(
    url: str,
    *,
    onboarding: bool = False,
    batch: Optional[dict[str, str]] = None,
) -> tuple[str, bool]:
    """
    Stable unique id for a parent thread URL.
    Returns (id, is_new). is_new=False → URL already known (do not draft again).
    Pass `batch` (url_key→id) when allocating many ids in one run so ids stay unique
    before STATUS upsert writes the registry.
    """
    key = normalize_status_url(url)
    if not key:
        raise ValueError("empty parent url")
    mapping = read_parent_url_registry(onboarding=onboarding)
    if key in mapping:
        return mapping[key], False
    if batch is not None and key in batch:
        return batch[key], False
    existing_ids = {r.get("id") for r in read_status(onboarding=onboarding)}
    existing_ids |= set(mapping.values())
    if batch:
        existing_ids |= set(batch.values())
    n = next_action_id(onboarding=onboarding)
    aid = format_action_id(n)
    while aid in existing_ids:
        n += 1
        aid = format_action_id(n)
    if batch is not None:
        batch[key] = aid
    return aid, True


def lookup_parent_id(url: str, *, onboarding: bool = False) -> Optional[str]:
    key = normalize_status_url(url)
    if not key:
        return None
    return read_parent_url_registry(onboarding=onboarding).get(key)


def open_status_url_keys(*, onboarding: bool = False) -> set[str]:
    """All registered parent URLs + open STATUS URLs (do not re-queue)."""
    keys = set(read_parent_url_registry(onboarding=onboarding).keys())
    for r in read_status(onboarding=onboarding):
        if not is_open_status(r.get("status") or ""):
            continue
        key = normalize_status_url(r.get("url") or "")
        if key:
            keys.add(key)
    return keys


def upsert_status_rows(
    new_rows: list[dict[str, str]], *, onboarding: bool = False
) -> None:
    """
    Merge new rows. Parent thread URLs are unique: one id per URL forever.
    Followups may share a URL but must set parent_id to that URL's id.
    """
    existing_list = read_status(onboarding=onboarding)
    existing = {r["id"]: r for r in existing_list}
    registry = read_parent_url_registry(onboarding=onboarding)
    parent_url_to_id = dict(registry)
    for r in existing_list:
        if is_parent_thread_type(r.get("type") or ""):
            key = normalize_status_url(r.get("url") or "")
            if key and r.get("id"):
                parent_url_to_id.setdefault(key, r["id"])

    for row in new_rows:
        rid = (row.get("id") or "").strip()
        url_key = normalize_status_url(row.get("url") or "")
        typ = (row.get("type") or "").lower()
        row.setdefault("parent_id", "")

        if is_parent_thread_type(typ) and url_key:
            known = parent_url_to_id.get(url_key)
            if known:
                # Same URL → must reuse same id; skip if already present
                if known in existing:
                    continue
                rid = known
                row["id"] = known
            else:
                if not rid:
                    rid = format_action_id(next_action_id(list(existing.values()), onboarding=onboarding))
                    row["id"] = rid
                parent_url_to_id[url_key] = rid
            row["parent_id"] = ""
        elif typ == "followup" and url_key:
            parent = parent_url_to_id.get(url_key) or lookup_parent_id(
                url_key, onboarding=onboarding
            )
            if parent:
                row["parent_id"] = parent

        if not rid:
            continue
        if rid in existing:
            prev = existing[rid].get("status") or ""
            if is_open_status(prev) or is_closed_status(prev):
                continue
        existing[rid] = {k: row.get(k, "") for k in STATUS_FIELDS}

    write_parent_url_registry(parent_url_to_id, onboarding=onboarding)
    ordered = sorted(existing.values(), key=lambda r: r.get("id", ""))
    write_status(ordered, onboarding=onboarding)


def next_action_id(
    rows: Optional[list[dict[str, str]]] = None, *, onboarding: bool = False
) -> int:
    rows = rows if rows is not None else read_status(onboarding=onboarding)
    max_id = 0
    for r in rows:
        try:
            max_id = max(max_id, int(r.get("id") or 0))
        except ValueError:
            continue
    return max_id + 1


def week_meta_path() -> Path:
    return THIS_WEEK / "_meta" / "week.json"


def read_week_meta() -> dict[str, Any]:
    path = week_meta_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def write_week_meta(data: dict[str, Any]) -> None:
    ensure_output_dirs()
    week_meta_path().write_text(json.dumps(data, indent=2), encoding="utf-8")


def archive_this_week_if_needed(week_id: str) -> None:
    """
    Snapshot prior week metadata into archive/<old_week_id>.
    Does NOT move STATUS.csv or action files — open work stays pending across weeks.
    """
    ensure_output_dirs()
    meta = read_week_meta()
    old = meta.get("week_id")
    if not old or old == week_id:
        return
    dest = ARCHIVE_DIR / old / "_meta"
    dest.mkdir(parents=True, exist_ok=True)
    meta_dir = THIS_WEEK / "_meta"
    for name in (
        "week.json",
        "funnel.json",
        "filter_summary.json",
        "discovery_summary.json",
        "engage_queue.json",
        "filtered_discovery.csv",
    ):
        src = meta_dir / name
        if src.exists():
            shutil.copy2(src, dest / name)
    (THIS_WEEK / "actions").mkdir(exist_ok=True)
    (THIS_WEEK / "_meta").mkdir(exist_ok=True)


def weekday_label(d: Optional[date] = None) -> str:
    d = d or date.today()
    return ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")[d.weekday()]


def load_engaged_urls() -> set[str]:
    if not ENGAGED_PATH.exists():
        return set()
    urls: set[str] = set()
    with ENGAGED_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            u = (row.get("url") or "").strip().lower().rstrip("/")
            if u:
                urls.add(u)
    return urls


def append_engaged(url: str, platform: str, status: str = "done") -> None:
    ensure_output_dirs()
    new_file = not ENGAGED_PATH.exists()
    with ENGAGED_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["url", "platform", "status", "marked_at"])
        if new_file:
            writer.writeheader()
        writer.writerow(
            {
                "url": url,
                "platform": platform,
                "status": status,
                "marked_at": datetime.utcnow().isoformat() + "Z",
            }
        )
    append_seen(url, platform, reason=f"engaged:{status}")


def _parse_seen_at(value: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        raw = value.rstrip("Z")
        return datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def load_seen_urls(*, ttl_days: int = SEEN_TTL_DAYS) -> set[str]:
    """URLs queued or engaged within the TTL window (default 90 days)."""
    if not SEEN_PATH.exists():
        return set()
    cutoff = datetime.now(timezone.utc) - timedelta(days=ttl_days)
    urls: set[str] = set()
    with SEEN_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            u = (row.get("url") or "").strip().lower().rstrip("/")
            if not u:
                continue
            seen_at = _parse_seen_at(row.get("seen_at") or "")
            if seen_at is None or seen_at >= cutoff:
                urls.add(u)
    return urls


def append_seen(url: str, platform: str = "", reason: str = "queued") -> None:
    ensure_output_dirs()
    key = (url or "").strip().lower().rstrip("/")
    if not key:
        return
    new_file = not SEEN_PATH.exists()
    with SEEN_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["url", "platform", "reason", "seen_at"]
        )
        if new_file:
            writer.writeheader()
        writer.writerow(
            {
                "url": url,
                "platform": platform,
                "reason": reason,
                "seen_at": datetime.now(timezone.utc).isoformat(),
            }
        )


def remember_urls(
    rows: Iterable[dict[str, Any]],
    *,
    reason: str = "queued",
) -> int:
    """Append many URLs to seen memory. Returns count written."""
    n = 0
    for row in rows:
        url = row.get("url") if isinstance(row, dict) else getattr(row, "url", "")
        platform = (
            row.get("platform")
            if isinstance(row, dict)
            else getattr(row, "platform", "")
        )
        if url:
            append_seen(str(url), str(platform or ""), reason=reason)
            n += 1
    return n


def blocked_urls() -> set[str]:
    """Union of engaged + recently seen — do not re-queue these."""
    return load_engaged_urls() | load_seen_urls()


def format_action_id(n: int) -> str:
    return f"{n:03d}"


def write_open_me(prefer: str = "today") -> Path:
    """Write OPEN_ME.md as copy of TODAY or WEEK_BRIEF."""
    ensure_output_dirs()
    today = THIS_WEEK / "TODAY.md"
    week = THIS_WEEK / "WEEK_BRIEF.md"
    open_me = THIS_WEEK / "OPEN_ME.md"
    if prefer == "week" and week.exists():
        open_me.write_text(week.read_text(encoding="utf-8"), encoding="utf-8")
    elif today.exists():
        open_me.write_text(today.read_text(encoding="utf-8"), encoding="utf-8")
    elif week.exists():
        open_me.write_text(week.read_text(encoding="utf-8"), encoding="utf-8")
    else:
        open_me.write_text(
            "# No brief yet\n\nUse the menu: **1) Start / refresh my week** first.\n",
            encoding="utf-8",
        )
    return open_me


def open_brief_file(path: Optional[Path] = None) -> None:
    path = path or (THIS_WEEK / "OPEN_ME.md")
    if not path.exists():
        print(f"Nothing to open yet: {path}")
        return
    print(f"Brief: {path}")
    if os.getenv("SOCIAL_AGENT_NO_OPEN", "").strip() in ("1", "true", "yes"):
        return
    try:
        if sys.platform == "darwin":
            subprocess.run(
                ["open", "-a", "TextEdit", str(path)],
                check=False,
                capture_output=True,
            )
        elif sys.platform.startswith("win"):
            os.startfile(str(path))  # type: ignore[attr-defined]
        else:
            subprocess.run(
                ["xdg-open", str(path)], check=False, capture_output=True
            )
    except Exception as exc:  # noqa: BLE001
        print(f"(Could not auto-open file: {exc}. Open it manually.)")


def copy_to_clipboard(text: str) -> bool:
    try:
        if sys.platform == "darwin":
            p = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            p.communicate(text.encode("utf-8"))
            return p.returncode == 0
        if sys.platform.startswith("win"):
            p = subprocess.Popen(["clip"], stdin=subprocess.PIPE, shell=True)
            p.communicate(text.encode("utf-16"))
            return True
        p = subprocess.Popen(
            ["xclip", "-selection", "clipboard"], stdin=subprocess.PIPE
        )
        p.communicate(text.encode("utf-8"))
        return p.returncode == 0
    except Exception:
        return False


def extract_paste_block(action_path: Path) -> tuple[str, str]:
    """Return (paste_text, open_url) from an action markdown file."""
    text = action_path.read_text(encoding="utf-8")
    open_url = ""
    for line in text.splitlines():
        if line.startswith("Open:"):
            open_url = line.split("Open:", 1)[1].strip()
            break
    paste = ""
    if "## PASTE" in text:
        after = text.split("## PASTE", 1)[1]
        # stop at next ## heading
        parts = after.split("\n## ")
        paste = parts[0].strip()
        if paste.startswith("```"):
            lines = paste.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            paste = "\n".join(lines).strip()
    return paste, open_url


def pending_actions(
    *,
    day: Optional[str] = None,
    include_overdue: bool = True,
) -> list[dict[str, str]]:
    """Today slice: open rows for this weekday + overdue pending (incl. prior weeks)."""
    today = weekday_label()
    day = day or today
    order_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today_idx = order_days.index(day) if day in order_days else 0
    current_week = (read_week_meta().get("week_id") or "").strip()

    rows = read_status()
    pending: list[dict[str, str]] = []
    for r in rows:
        st = (r.get("status") or "").lower()
        if not is_open_status(st):
            continue
        rday = r.get("day") or ""
        if rday == day:
            pending.append(r)
            continue
        if not include_overdue or st != "pending":
            continue
        week = (r.get("week_id") or "").strip()
        if current_week and week and week < current_week:
            pending.append(r)
        elif rday in order_days and order_days.index(rday) < today_idx:
            pending.append(r)
    return pending


def open_actions(*, onboarding: bool = False) -> list[dict[str, str]]:
    return [r for r in read_status(onboarding=onboarding) if is_open_status(r.get("status") or "")]


def sort_for_today(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Engagement-max order: follow-ups → fresh tier1 → tier1 → create → rest."""

    def key(r: dict[str, str]) -> tuple:
        st = r.get("status") or ""
        typ = (r.get("type") or "").lower()
        tier = int(r.get("tier") or "9")
        fresh = 0 if (r.get("fresh") or "") == "1" else 1
        is_follow = 0 if st == "awaiting_reply" or typ == "followup" else 1
        is_create = 0 if typ.startswith("create") or typ in (
            "short_script",
            "caption",
            "post",
            "stories",
            "page_post",
        ) else 1
        # followups first, then engage (not create), fresh, tier, id
        is_engage = 0 if is_create == 1 and typ not in ("followup",) else 1
        if typ in (
            "reply",
            "comment",
            "engage",
            "followup",
            "group_comment",
            "answer",
        ):
            is_engage = 0
        return (is_follow, is_engage, fresh, tier, r.get("id") or "")

    return sorted(rows, key=key)
