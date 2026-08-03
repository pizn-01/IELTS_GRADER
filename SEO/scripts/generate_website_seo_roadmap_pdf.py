#!/usr/bin/env python3
"""
Generate WEBSITE_SEO_ROADMAP.pdf — strategy roadmap for www.ieltsgrader.com.
Run: python3 SEO/scripts/generate_website_seo_roadmap_pdf.py
Source of truth: SEO/WEBSITE_SEO_ROADMAP.md
"""

from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent.parent / "WEBSITE_SEO_ROADMAP.pdf"


class RoadmapPDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "ieltsgrader.com - Website SEO Roadmap", align="L")
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
            f"Page {self.page_no()}/{{nb}}  |  Internal - www.ieltsgrader.com",
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
    pdf = RoadmapPDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.h1("Website SEO Roadmap")
    pdf.body("IELTS AI Tutor by IELTSGRADER - maximize organic SEO fastest")
    pdf.body("Canonical: https://www.ieltsgrader.com | Living doc: SEO/WEBSITE_SEO_ROADMAP.md")
    pdf.callout(
        "North star",
        "Organic search -> helpful article -> sample + examiner analysis -> "
        "try-it CTA -> /ielts-essay-checker -> free band score -> practice -> subscription. "
        "Do NOT chase head terms 'IELTS' / 'IELTS Writing'. Own Writing + AI evaluation.",
    )

    pdf.h2("Speed levers")
    pdf.bullet("Long-tail exact-match first (Q&A posts index/rank fastest)")
    pdf.bullet("Velocity: 2-3 new URLs/week + 2 improves/week (1/week loses this market)")
    pdf.bullet("Snippet engineering: 40-55 word answer under H1 for Position #0")
    pdf.bullet("Data moat: publish studies from real graded essays competitors cannot copy")
    pdf.bullet("Same-day indexing: sitemap + GSC request + IndexNow + homepage/hub link")

    pdf.h2("Competitive reality")
    pdf.bullet("Legacy blogs (Liz, Advantage, Simon): static advice -> we add live AI eval + fresh samples")
    pdf.bullet("Official orgs (IELTS.org, IDP, BC): generic -> we own emotional long-tail (stuck at 6.5)")
    pdf.bullet("Direct AI checkers (Writing9 etc.): same promise -> out-teach with examiner analysis + data studies")
    pdf.bullet("AI content farms: thin listicles -> real scored essays + side-by-side band tests")
    pdf.callout(
        "SERP recon (mandatory before every post)",
        "Search the exact query. Record: (a) format that ranks, (b) PAA questions, "
        "(c) word-count of top 3. Match format, beat depth, capture PAA. Log in frontmatter.",
    )

    pdf.add_page()
    pdf.h2("Part A - Diagnosis (priority filter)")
    pdf.h3("Critical risks (close first)")
    pdf.bullet("GSC www not verified; sitemap not submitted; P0 not requested")
    pdf.bullet("Prod prerender not guaranteed on every deploy")
    pdf.bullet("www vs apex inconsistency")
    pdf.bullet("No weekly GSC -> title rewrite loop")
    pdf.h3("Lead-review risks (also close)")
    pdf.bullet("Scaled-content / HCU: every post must pass B4 quality bar; no template-only text")
    pdf.bullet("E-E-A-T: author bylines, methodology page, last-updated dates")
    pdf.bullet("SERP recon before writing; rotate internal anchors; no Wave C template cloning")
    pdf.bullet("Track time-to-index (<7 days) and competitor positions monthly")
    pdf.body("Full 28-item risk register: see WEBSITE_SEO_ROADMAP.md Part A2.")

    pdf.h2("Part B - Flywheel + quality bar")
    pdf.h3("URL roles")
    pdf.bullet("Attract: blog guides / Q&A / topics")
    pdf.bullet("Prove: scored samples, band comparisons, error taxonomy")
    pdf.bullet("Convert: /ielts-essay-checker (primary), Task 1/2 checkers")
    pdf.bullet("Orient / Deepen / Monetize: AI tutor, mock, band-score, pricing")
    pdf.h3("Page recipe (every Attract/Prove page)")
    pdf.bullet("Exact keyword in title, first ~100 words, one H2")
    pdf.bullet("Examiner-style teaching + Try-it-yourself block")
    pdf.bullet("CTA -> essay checker; related blog link; FAQ schema on Q&A")
    pdf.h3("B4 length by type")
    pdf.bullet("Q&A / snippet: 800-1,200w | answer in first 40-55 words under H1")
    pdf.bullet("Guide / how-to: 1,500-2,200w | steps + before/after + checklist")
    pdf.bullet("Scored sample / topic: 1,200-1,800w | full essay + TR/CC/LR/GRA justification")
    pdf.bullet("Comparison / trust: 1,500-2,500w | side-by-side real scores")
    pdf.bullet("Pillar / hub: 2,000-3,000w | TOC + section per subtype")
    pdf.h3("Title / E-E-A-T")
    pdf.bullet("Title <=60 chars, keyword front, one honest CTR modifier")
    pdf.bullet("Meta 150-160 chars: keyword + benefit + soft CTA")
    pdf.bullet("Author byline + methodology page + last-updated + Article dateModified")
    pdf.bullet("Rotate anchors: check with AI / band score free / try checker / see how it scores")

    pdf.add_page()
    pdf.h2("Part C - Improve existing URLs")
    pdf.body("Improve before creating near-duplicates. Exact search phrasing. End every page in flywheel CTA.")
    pdf.h3("Docx First 10 -> live URLs")
    pdf.bullet("1. Writing Checker landing -> /ielts-essay-checker (title/FAQ/schema)")
    pdf.bullet("2-3. Band 7 / 6->7 -> UPDATE plateau + band-6-vs-7")
    pdf.bullet("4. Task 2 structure -> CREATE Wave A; bridge opinion post")
    pdf.bullet("5. Band score calculator -> /ielts-writing-band-score + scoring post")
    pdf.bullet("6. Essay types hub -> CREATE Wave B; bridge opinion")
    pdf.bullet("7-10. TR / CC / Lexical / Grammar -> deepen existing criteria posts")
    pdf.h3("Priority UPDATE slugs (exact titles)")
    pdf.bullet("stuck-at-band-6-5-plateau -> Why Am I Stuck at 6.5 / Improve 6.5 to 7")
    pdf.bullet("band-6-vs-7-task-2 -> Difference Between Band 6 and Band 7")
    pdf.bullet("how-ielts-writing-is-scored -> How Scores Are Calculated")
    pdf.bullet("coherence-cohesion-14-day-plan -> Band 7+ without overusing linking words")
    pdf.bullet("lexical-resource-band-6-to-7 -> Lexical mistakes that drop your score")
    pdf.bullet("Samples edu/tech/env -> full flywheel block (analysis -> try it -> checker)")
    pdf.h3("C6 weekly GSC decision rules")
    pdf.bullet("Impressions>100, pos 4-15: IMPROVE NOW (highest ROI)")
    pdf.bullet("Pos 1-3, low CTR: rewrite title/meta only")
    pdf.bullet("Wrong URL ranking: fix cannibalization")
    pdf.bullet("0 impressions @14d: re-index; @21d: investigate prerender; @90d: merge/prune")
    pdf.bullet("Query with impressions but no page: insert into next create queue")

    pdf.add_page()
    pdf.h2("Part D - Create queues")
    pdf.body("First-30 mix: 10 commercial/problem + 10 writing-skill + 10 topic/sample.")
    pdf.h3("Ship-first five (exact titles)")
    pdf.bullet("How to Improve IELTS Writing from 6.5 to 7")
    pdf.bullet("How to Improve IELTS Writing from 7 to 8")
    pdf.bullet("Is ChatGPT Accurate for IELTS Writing Score?")
    pdf.bullet("Best Essay Structure for IELTS Writing Task 2")
    pdf.bullet("How Many Words for IELTS Writing Task 2")
    pdf.h3("Wave A - high-intent / fast rank (front-load Q&A)")
    pdf.bullet("Word count / paragraphs / idioms / Can I use I / timing / generate ideas")
    pdf.bullet("ChatGPT accuracy / overestimates / prompts / best AI tools 2026 / practice")
    pdf.bullet("Always score Band 6? / overused words + Band 7 alternatives / Can AI check my essay?")
    pdf.h3("Wave B - criteria + essay types")
    pdf.bullet("TR/TA fix, GRA Top 10, Agree/Disagree, Discuss Both, Adv/Dis, Problem-Solution, Two-part")
    pdf.bullet("Essay-types hub, intro/paraphrase, self-edit, Task 1 overview/mistakes, GT openings")
    pdf.bullet("Task 1 vs Task 2 guide, body/conclusion, AI feedback prompt guide")
    pdf.h3("Wave C - topic Band 9 flywheel")
    pdf.bullet("Format: Question -> Band 9 sample -> examiner analysis (TR/CC/LR/GRA) -> try it -> AI score")
    pdf.bullet("Themes: Education, Technology, Environment, Health, Government, Work")
    pdf.bullet("Each page UNIQUE (no template cloning). Upgrade existing edu/tech/env samples first.")
    pdf.h3("D9 Data moat (start Week 3)")
    pdf.bullet("Monthly study from real grading data (mistakes capping Band 6; ChatGPT vs us vs examiner)")
    pdf.bullet("Free widgets: band score calculator + Task 2 word counter")
    pdf.bullet("Pitch studies for backlinks. Anonymize + state methodology.")

    pdf.add_page()
    pdf.h2("Part E - 12-week timeline")
    pdf.bullet("W0-1 Foundation: GSC www, sitemap, indexing, prerender, www align, IndexNow, scorecard")
    pdf.bullet("W1-2: P0 polish + E-E-A-T ship + 5-6 Wave A Q&A + refresh plateau/band-6-vs-7")
    pdf.bullet("W3-4: Wave A finish + tool depth + calculator widget + start accuracy data study")
    pdf.bullet("W5-6: Wave B essay types + publish data study + homepage latest blog links")
    pdf.bullet("W7-8: Wave B finish + Tier-1 refresh + second data study")
    pdf.bullet("W9-10: Topic samples Edu/Tech/Env (unique, full flywheel)")
    pdf.bullet("W11-12: Health/Gov/Work + GSC rewrites + 90d prune + next-quarter queue")
    pdf.callout(
        "Velocity + indexing (every publish, same day)",
        "2-3 new posts/week (SERP Mon, draft Tue-Wed, review+publish Thu-Fri). "
        "2 improves/week from C6. Improves on pages with impressions beat new posts if capacity is tight. "
        "Pipeline: regen sitemap -> GSC Request indexing -> IndexNow -> homepage/hub link -> day-7 check. "
        "Quality bar always gates publish (HCU risk).",
    )

    pdf.h2("Part F - KPIs + milestones")
    pdf.bullet("Indexed URL count | Time-to-index <7 days (if slips, stop creating)")
    pdf.bullet("Impressions P0+Wave A | CTR on rewritten titles")
    pdf.bullet("Queries in top 10 / top 3 (weekly) | Featured snippets / PAA captured")
    pdf.bullet("Organic landings on /ielts-essay-checker | Free eval starts")
    pdf.bullet("Referring domains (monthly) | Zero-impression @90d prune list")
    pdf.bullet("Monthly: who holds pos 1-3 on the 20 D2 keywords (Liz / Advantage / Writing9)")
    pdf.h3("Honest milestones (newer domain)")
    pdf.bullet("W2-4: Q&A indexed, first impressions")
    pdf.bullet("W4-8: long-tail top-10, first snippets")
    pdf.bullet("W8-12: Wave A top-5 exact match; checker impressions climb")
    pdf.bullet("Months 4-6: cluster authority; commercial head terms move - do not panic-pivot early")

    pdf.callout(
        "Remember",
        "Foundation before content. Improve before near-duplicates. "
        "Every post feeds the flywheel. Cadence ops: WEBSITE_SEO_CADENCE.md. "
        "Full matrices and queues: WEBSITE_SEO_ROADMAP.md.",
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
