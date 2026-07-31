#!/usr/bin/env python3
"""
Generate WEBSITE_SEO_CADENCE.pdf — site-only SEO daily/weekly/monthly guide.
Run: python3 SEO/scripts/generate_website_seo_cadence_pdf.py
"""

from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent.parent / "WEBSITE_SEO_CADENCE.pdf"

BLOG_SLUGS = [
    "how-ielts-writing-is-scored",
    "task-2-sample-band-6-education",
    "band-6-vs-7-task-2",
    "task-2-sample-band-7-technology",
    "coherence-cohesion-14-day-plan",
    "feedback-to-study-plan",
    "task-1-trends-vocabulary",
    "task-1-bar-chart-band-7",
    "gt-formal-letter-checklist",
    "gt-letter-sample-band-8-complaint",
    "is-ai-ielts-tutoring-accurate",
    "ai-tutor-vs-human-tutor",
    "free-vs-paid-ielts-checker",
    "ielts-mock-writing-practice-guide",
    "task-2-sample-band-6-5-environment",
    "task-2-opinion-essay-band-7-5",
    "ielts-writing-error-taxonomy",
    "dual-ai-grading-explained",
    "task-response-vs-achievement",
    "mock-exam-to-14-day-sprint",
    "personalized-learning-editions-guide",
    "academic-vs-general-training-writing",
    "lexical-resource-band-6-to-7",
    "handwritten-essay-ocr-tips",
    "ielts-writing-practice-plans-explained",
    "stuck-at-band-6-5-plateau",
]


class CadencePDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "ieltsgrader.com - Website SEO Cadence (site-only)", align="L")
        self.ln(4)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(
            0,
            10,
            f"Page {self.page_no()}/{{nb}}  |  Internal - www.ieltsgrader.com only",
            align="C",
        )

    def _reset_x(self) -> None:
        self.set_x(self.l_margin)

    def h1(self, text: str) -> None:
        self._reset_x()
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(26, 31, 54)
        self.multi_cell(0, 10, text)
        self.ln(2)
        self._reset_x()

    def h2(self, text: str) -> None:
        self.ln(3)
        self._reset_x()
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(26, 31, 54)
        self.multi_cell(0, 8, text)
        self.ln(1)
        self.set_draw_color(59, 130, 246)
        y = self.get_y()
        self.line(self.l_margin, y, self.l_margin + 36, y)
        self.ln(3)
        self._reset_x()

    def h3(self, text: str) -> None:
        self.ln(2)
        self._reset_x()
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(45, 55, 72)
        self.multi_cell(0, 7, text)
        self.ln(0.5)
        self._reset_x()

    def body(self, text: str) -> None:
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(1)
        self._reset_x()

    def bullet(self, text: str) -> None:
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, f"  -  {text}")
        self._reset_x()

    def callout(self, title: str, text: str) -> None:
        self.ln(2)
        self._reset_x()
        self.set_fill_color(245, 247, 250)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(26, 31, 54)
        self.multi_cell(0, 6, title, fill=True)
        self._reset_x()
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5, text, fill=True)
        self.ln(2)
        self._reset_x()


def build() -> Path:
    pdf = CadencePDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.h1("Website SEO Cadence")
    pdf.body("IELTS AI Tutor by IELTSGRADER - activities on ieltsgrader.com only")
    pdf.body(
        "Canonical host: https://www.ieltsgrader.com "
        "(apex redirects to www). Use the www property in Google Search Console."
    )
    pdf.callout(
        "Scope",
        "This guide covers pages, blog, meta, internal links, sitemap, schema, "
        "and GSC for www.ieltsgrader.com only. Off-site promotion (Reddit, "
        "LinkedIn, Quora, YouTube, etc.) lives in SEO/social-media/.",
    )
    pdf.h3("North star")
    pdf.bullet("Indexable content on winning keyword clusters")
    pdf.bullet("Strong titles/meta for CTR")
    pdf.bullet("Internal links from blog to tool converters")
    pdf.bullet("Healthy technical crawl (sitemap, indexing, CWV)")
    pdf.bullet("Clear free-eval / signup CTA on every P0 page")

    # URL inventory
    pdf.add_page()
    pdf.h2("1. Full URL inventory")
    pdf.body("Base: https://www.ieltsgrader.com")
    pdf.h3("Core / tools")
    for path in (
        "/",
        "/pricing",
        "/ielts-ai-tutor",
        "/ielts-essay-checker",
        "/ielts-task-1-checker",
        "/ielts-task-2-checker",
        "/ielts-writing-band-score",
        "/ielts-mock-writing-test",
        "/grade-my-essay",
        "/mock-exam",
    ):
        pdf.bullet(path)
    pdf.h3("Blog")
    pdf.bullet("/blog (index)")
    for i, slug in enumerate(BLOG_SLUGS, 1):
        pdf.bullet(f"{i}. /blog/{slug}")
    pdf.h3("Legal")
    pdf.bullet("/terms")
    pdf.bullet("/privacy")
    pdf.bullet("/cookies")
    pdf.h3("Never optimize (robots Disallow)")
    pdf.body(
        "/dashboard, /report, /performance, /learning, /settings, /admin, "
        "/subscription, /upgrade, /analysis-ready"
    )
    pdf.h3("Effort priority")
    pdf.bullet(
        "P0: /, /ielts-essay-checker, /ielts-ai-tutor, /blog, top GSC click pages"
    )
    pdf.bullet(
        "P1: Task 1/2 checkers, band score, mock test, /grade-my-essay"
    )
    pdf.bullet("P2: Other blog posts, /pricing, legal (accuracy only)")

    # Create vs improve
    pdf.add_page()
    pdf.h2("2. Create vs improve (continuous)")
    pdf.body(
        "Two streams always running: CREATE new indexable URLs (mostly blog) "
        "and IMPROVE existing URLs so they rank and convert better."
    )
    pdf.h3("SEO impact")
    pdf.bullet("New blog posts: new queries, long-tail, more links into essay checker")
    pdf.bullet("Scored samples: high-intent long-tail + conversion")
    pdf.bullet("Title/meta rewrites: higher SERP CTR on pages that already get impressions")
    pdf.bullet("Deeper tool FAQs: relevance for head terms (essay checker, AI tutor)")
    pdf.bullet("Internal links blog -> tools: structure + converter support")
    pdf.bullet("Sitemap + indexing: faster discovery of new/changed URLs")
    pdf.bullet("Refresh aging posts: protect rankings; prune thin after 90d")

    pdf.h2("3. How to create a new blog post")
    pdf.bullet("1. Pick topic from KEYWORDS.md + GSC (impressions without a strong page)")
    pdf.bullet("Type: Guide (900-1500w), Scored sample (essay + notes), Comparison")
    pdf.bullet("2. Slug: lowercase-hyphens, keyword, no dates. Title: keyword + benefit | IELTS AI Tutor")
    pdf.bullet("3. Write: H1 + keyword in first 100 words; teach concretely; no banned claims")
    pdf.bullet("4. Required: Try it yourself -> /ielts-essay-checker; Related reading links")
    pdf.bullet("5. validate_frontmatter.py -> generate_sitemap.py -> deploy -> GSC Request indexing")
    pdf.body("File path: ielts-grader-app/src/content/blog/{slug}.md (template: SEO/blog/_TEMPLATE.md)")

    pdf.h2("4. What to create constantly")
    pdf.bullet("Priority: Task 2 samples -> Task 1/GT samples -> band-improvement guides -> trust/comparison")
    pdf.bullet("Steady volume: >=1 new published blog URL per week")
    pdf.bullet("When capacity allows: 1-2 scored samples per week")
    pdf.bullet("New tool/landing URLs: rare - only for clear P0 keyword with no page")
    pdf.bullet("Never create speaking/reading/leaked-test content")

    pdf.h2("5. What to improve constantly")
    pdf.h3("Tool + home pages (P0/P1)")
    pdf.bullet("Weekly Tue: title/meta on low-CTR pages (impressions > 100, CTR < 2%)")
    pdf.bullet("Monthly: FAQ + schema on one tool page; cross-links to siblings + 1 blog")
    pdf.bullet("Always: soft CTA above fold; no banned claims")
    pdf.h3("Existing blog posts")
    pdf.bullet("Rewrite titles when CTR low; refresh high-impression posts monthly")
    pdf.bullet("Add missing tool/related links on Thu; expand thin posts stuck at positions 8-20")
    pdf.bullet("Prune/merge zero-impression posts after 90 days")
    pdf.h3("Map to weekdays")
    pdf.bullet("Mon: measure + pick next create and improve targets")
    pdf.bullet("Tue: IMPROVE titles/meta | Wed: CREATE publish | Thu: IMPROVE links/FAQ | Fri: ship sitemap/index")

    # Daily
    pdf.add_page()
    pdf.h2("6. Daily activities")
    pdf.body("~30-60 minutes when content work is active. No social posting.")
    pdf.bullet(
        "GSC Page indexing: check new or 'Discovered - currently not indexed' "
        "P0 URLs; Request indexing if needed."
    )
    pdf.bullet(
        "Draft progress: write/edit toward publish (blog/_TEMPLATE.md, BRANDING.md)."
    )
    pdf.bullet(
        "Live spot-check one URL: title, meta, H1, primary CTA to free eval."
    )
    pdf.bullet(
        "Note one internal-link opportunity on a P0/P1 page (INTERNAL_LINKING.md)."
    )

    # Weekly
    pdf.h2("7. Weekly activities (Mon-Fri)")
    pdf.bullet(
        "Mon: GSC scorecard (impressions, clicks, CTR, position, indexed). "
        "Export Performance; optional gsc_summarize.py. "
        "Low-CTR candidates: impressions > 100 and CTR < 2%."
    )
    pdf.bullet("Tue: Title/meta rewrite on 1-2 low-CTR P0/P1 pages; ship.")
    pdf.bullet(
        "Wed: Publish or deepen one blog post (target >=1/week; "
        "1-2 samples/week when capacity allows)."
    )
    pdf.bullet(
        "Thu: Internal linking (new post <-> hubs/tools); strengthen 2 cluster "
        "links; optional FAQ/schema on one tool page."
    )
    pdf.bullet(
        "Fri: Regen sitemap; deploy; Request indexing for new/changed URLs; "
        "close site-only scorecard actions."
    )
    pdf.callout(
        "Ops commands",
        "python3 SEO/scripts/validate_frontmatter.py\n"
        "python3 SEO/scripts/generate_sitemap.py\n"
        "Sitemap: https://www.ieltsgrader.com/sitemap.xml",
    )

    # Monthly
    pdf.h2("8. Monthly activities")
    pdf.bullet("Cluster review: which clusters gained; which tool converts best.")
    pdf.bullet("Plan 2 new posts (or major refreshes) in the winning cluster.")
    pdf.bullet("Refresh aging high-impression posts (examples, CTAs, year).")
    pdf.bullet(
        "Prune/merge/noindex: zero-impression posts after 90 days "
        "(document in TRACKER.md)."
    )
    pdf.bullet(
        "Technical health: Coverage, PageSpeed/CWV on / and "
        "/ielts-essay-checker; sitemap + prerender in prod."
    )
    pdf.bullet("Schema/FAQ expansion on one P0 tool page.")
    pdf.bullet("Bing Webmaster: sitemap parity with GSC.")

    # Post-publish
    pdf.add_page()
    pdf.h2("9. Post-publish checklist")
    pdf.body("Run for every new or updated indexable URL:")
    pdf.bullet("Frontmatter valid (status: published, slug, title, description)")
    pdf.bullet("Internal links to >=1 tool hub + related posts")
    pdf.bullet("Soft CTA to free eval / essay checker (no banned claims)")
    pdf.bullet("generate_sitemap.py + deploy")
    pdf.bullet("GSC URL Inspection -> Request indexing")
    pdf.bullet("Add URL to weekly scorecard 'New content published'")

    pdf.h2("10. Site levers (what maximizing SEO means here)")
    pdf.bullet("CREATE: more indexable content on winning clusters")
    pdf.bullet("IMPROVE: better titles/meta, depth, FAQs on existing URLs")
    pdf.bullet("Stronger internal links from blog to converters")
    pdf.bullet("Healthy technical crawl")
    pdf.bullet("Clear conversion path on every P0 page")
    pdf.body(
        "Promoting through other platforms is out of scope for this PDF. "
        "Site quality is what Google ranks and what off-site traffic lands on."
    )

    # Scorecard
    pdf.h2("11. Weekly scorecard tear-off (site-only)")
    pdf.body("Week of: ___________")
    pdf.bullet("Impressions / clicks / CTR / avg position / indexed pages")
    pdf.bullet("[ ] GSC (+ Bing if due) checked")
    pdf.bullet("[ ] New content CREATED/published: ___________")
    pdf.bullet("[ ] Existing URLs IMPROVED (titles/meta/links): ___________")
    pdf.bullet("[ ] Internal links added to new posts")
    pdf.bullet("[ ] Sitemap regenerated + indexing requested")
    pdf.body(
        "Low-CTR rewrite list: impressions > 100, CTR < 2%. "
        "Full tables: SEO/MEASUREMENT.md. Editable source: SEO/WEBSITE_SEO_CADENCE.md."
    )
    pdf.callout(
        "Remember",
        "Create every week. Improve every week. Work P0 URLs first. "
        "Measure in GSC every Monday. Never optimize Disallow routes.",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    return OUT


def main() -> int:
    path = build()
    print(f"Wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
