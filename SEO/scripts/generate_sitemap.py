#!/usr/bin/env python3
"""Generate sitemap.xml for ieltsgrader.com public routes."""

from datetime import date
from pathlib import Path

BASE_URL = "https://www.ieltsgrader.com"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
APP_PUBLIC = REPO_ROOT / "ielts-grader-app" / "public"
BLOG_SRC = REPO_ROOT / "ielts-grader-app" / "src" / "content" / "blog"
OUTPUT = APP_PUBLIC / "sitemap.xml"

STATIC_ROUTES = [
    "/",
    "/pricing",
    "/features",
    "/sample-report",
    "/ielts-ai-tutor",
    "/ielts-essay-checker",
    "/ielts-task-1-checker",
    "/ielts-task-2-checker",
    "/ielts-writing-band-score",
    "/ielts-mock-writing-test",
    "/grade-my-essay",
    "/mock-exam",
    "/blog",
    "/methodology",
    "/terms",
    "/privacy",
    "/cookies",
]

PRIORITY = {
    "/": "1.0",
    "/ielts-ai-tutor": "0.9",
    "/ielts-essay-checker": "0.9",
    "/ielts-task-2-checker": "0.9",
    "/ielts-task-1-checker": "0.9",
    "/ielts-writing-band-score": "0.8",
    "/ielts-mock-writing-test": "0.8",
    "/grade-my-essay": "0.9",
    "/mock-exam": "0.8",
    "/blog": "0.8",
    "/features": "0.8",
    "/sample-report": "0.7",
    "/pricing": "0.7",
    "/methodology": "0.5",
}


def slug_from_frontmatter(path: Path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None
    end = text.find("---", 3)
    if end == -1:
        return None
    front = text[3:end]
    status = None
    slug = None
    for line in front.splitlines():
        if line.startswith("status:"):
            status = line.split(":", 1)[1].strip().strip('"')
        if line.startswith("slug:"):
            slug = line.split(":", 1)[1].strip().strip('"')
    if status == "published" and slug:
        return slug
    return None


def blog_slugs():
    if not BLOG_SRC.exists():
        return []
    slugs = []
    for md in sorted(BLOG_SRC.glob("*.md")):
        if md.name.startswith("_"):
            continue
        slug = slug_from_frontmatter(md)
        if slug:
            slugs.append(slug)
    return slugs


def build_url(path: str, lastmod: str, changefreq: str, priority: str) -> str:
    loc = f"{BASE_URL}{path}"
    return f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>"""


def main():
    today = date.today().isoformat()
    urls = []

    for route in STATIC_ROUTES:
        prio = PRIORITY.get(route, "0.6")
        freq = "weekly" if route == "/" else "monthly"
        urls.append(build_url(route, today, freq, prio))

    for slug in blog_slugs():
        urls.append(build_url(f"/blog/{slug}", today, "monthly", "0.7"))

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>
"""

    APP_PUBLIC.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(xml, encoding="utf-8")
    print(f"Wrote {len(urls)} URLs to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
