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
ARCHIVE_DIR = OUTPUT_DIR / "archive"
ENGAGED_PATH = OUTPUT_DIR / "engaged_urls.csv"
SEEN_PATH = OUTPUT_DIR / "seen_urls.csv"
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
]

load_dotenv(SCRIPTS_DIR / ".env")


def ensure_output_dirs() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    THIS_WEEK.mkdir(parents=True, exist_ok=True)
    (THIS_WEEK / "actions").mkdir(parents=True, exist_ok=True)
    (THIS_WEEK / "_meta").mkdir(parents=True, exist_ok=True)


def status_path() -> Path:
    return THIS_WEEK / "_meta" / "STATUS.csv"


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
    """Move THIS_WEEK contents to archive/<old_week_id> when starting a new week."""
    ensure_output_dirs()
    meta = read_week_meta()
    old = meta.get("week_id")
    if not old or old == week_id:
        return
    dest = ARCHIVE_DIR / old
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    for child in list(THIS_WEEK.iterdir()):
        shutil.move(str(child), str(dest / child.name))
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


def read_status() -> list[dict[str, str]]:
    path = status_path()
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    # Backfill new optional columns for older STATUS.csv files
    for r in rows:
        r.setdefault("cta", "")
        r.setdefault("reply_check", "")
    return rows

def write_status(rows: list[dict[str, str]]) -> None:
    ensure_output_dirs()
    path = status_path()
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=STATUS_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in STATUS_FIELDS})


def upsert_status_rows(new_rows: list[dict[str, str]]) -> None:
    existing = {r["id"]: r for r in read_status()}
    for row in new_rows:
        rid = row["id"]
        if rid in existing and existing[rid].get("status") in (
            "done",
            "skipped",
            "awaiting_reply",
        ):
            # keep human status unless re-id
            continue
        existing[rid] = {k: row.get(k, "") for k in STATUS_FIELDS}
    ordered = sorted(existing.values(), key=lambda r: r.get("id", ""))
    write_status(ordered)


def next_action_id(rows: Optional[list[dict[str, str]]] = None) -> int:
    rows = rows if rows is not None else read_status()
    max_id = 0
    for r in rows:
        try:
            max_id = max(max_id, int(r.get("id") or 0))
        except ValueError:
            continue
    return max_id + 1


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
    today = weekday_label()
    day = day or today
    order_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today_idx = order_days.index(day) if day in order_days else 0

    rows = read_status()
    pending: list[dict[str, str]] = []
    for r in rows:
        st = (r.get("status") or "").lower()
        if st not in ("pending", "awaiting_reply"):
            continue
        rday = r.get("day") or ""
        if rday == day:
            pending.append(r)
        elif include_overdue and rday in order_days:
            if order_days.index(rday) < today_idx and st == "pending":
                pending.append(r)
    return pending


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
