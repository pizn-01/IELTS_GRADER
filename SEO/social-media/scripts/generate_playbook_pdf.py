#!/usr/bin/env python3
"""Generate EMPLOYEE_PLAYBOOK.pdf - run once after edits to regenerate the PDF."""

from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent.parent / "EMPLOYEE_PLAYBOOK.pdf"


class PlaybookPDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "IELTS AI Tutor by IELTSGRADER - Employee Social Playbook", align="L")
        self.ln(4)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}  |  Confidential - internal use", align="C")

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

    def quote(self, text: str) -> None:
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(50, 50, 50)
        self.set_x(self.l_margin + 5)
        self.multi_cell(self.epw - 10, 5, f'"{text}"')
        self.ln(1)
        self._reset_x()

    def table_row(self, cells: list[str], widths: list[float], header: bool = False) -> None:
        self._reset_x()
        self.set_font("Helvetica", "B" if header else "", 8)
        self.set_text_color(20, 20, 20)
        h = 6
        x0 = self.l_margin
        y0 = self.get_y()
        max_h = h
        for c, w in zip(cells, widths):
            lines = max(1, self.get_string_width(c) // max(w - 2, 1) + 1)
            # Fallback height estimate without dry_run quirks
            approx_lines = max(1, int(len(c) / max(int(w / 1.8), 1)) + 1)
            max_h = max(max_h, approx_lines * h, int(lines) * h if isinstance(lines, (int, float)) else h)
        # Simpler: use multi_cell dry_run when available
        try:
            max_h = h
            for c, w in zip(cells, widths):
                n = len(self.multi_cell(w, h, c, dry_run=True, output="LINES"))
                max_h = max(max_h, n * h)
        except TypeError:
            max_h = max(h * 2, max_h)
        if y0 + max_h > self.page_break_trigger:
            self.add_page()
            y0 = self.get_y()
            x0 = self.l_margin
        for c, w in zip(cells, widths):
            self.set_xy(x0, y0)
            self.multi_cell(w, h, c, border=1)
            x0 += w
        self.set_y(y0 + max_h)
        self._reset_x()


def build() -> Path:
    pdf = PlaybookPDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Cover
    pdf.ln(40)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(26, 31, 54)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 12, "Employee Social Media Playbook", align="C")
    pdf.ln(4)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 14)
    pdf.multi_cell(0, 8, "IELTS AI Tutor by IELTSGRADER", align="C")
    pdf.ln(2)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(
        0,
        6,
        "How to reply, create posts, build trust, and convert on\n"
        "Facebook - Instagram - Reddit - Quora - Twitter/X - LinkedIn - TikTok - YouTube",
        align="C",
    )
    pdf.ln(10)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, "Site: https://ieltsgrader.com", align="C")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 6, "Primary CTA: Get your free band score", align="C")
    pdf.set_x(pdf.l_margin)

    # 1 Mission
    pdf.add_page()
    pdf.h1("1. Mission & product facts")
    pdf.body(
        "Your job is to help real IELTS students with writing advice, earn trust, "
        "and - only when appropriate - invite them to try a free evaluation on "
        "ieltsgrader.com. You are not running ads. You are building authority through "
        "replies and useful content on our brand accounts."
    )
    pdf.h3("One-line positioning")
    pdf.quote(
        "IELTS AI Tutor by IELTSGRADER - Your AI writing tutor that grades essays "
        "in 60 seconds, explains every mistake, and builds a personalized plan to "
        "reach your target band."
    )
    pdf.h3("What we are")
    for t in [
        "AI writing tutor for IELTS (Task 1 & 2, Academic & General Training)",
        "Criterion-by-criterion feedback (TR, CC, LR, GRA) - not just a score",
        "Fix cards, model answers, study plans, mock exam mode",
        "Free evaluation to start - no card required for first try messaging",
    ]:
        pdf.bullet(t)
    pdf.h3("What we are NOT / never say")
    for t in [
        '"Just a grader" or "ChatGPT wrapper"',
        "Guaranteed Band 7 / 100% accurate / official IELTS replacement",
        "Link spam, fake reviews, or sockpuppet accounts",
        "Unverified claims (\"10k students\", \"4.9 rating\") unless management approves",
    ]:
        pdf.bullet(t)
    pdf.h3("Approved URLs")
    for t in [
        "https://ieltsgrader.com",
        "https://ieltsgrader.com/ielts-ai-tutor",
        "https://ieltsgrader.com/ielts-essay-checker",
        "https://ieltsgrader.com/ielts-task-2-checker",
        "https://ieltsgrader.com/ielts-task-1-checker",
        "https://ieltsgrader.com/blog",
    ]:
        pdf.bullet(t)
    pdf.body(
        "Prefer UTM tags when possible, e.g. "
        "?utm_source=reddit&utm_medium=social&utm_campaign=organic_reply"
    )

    # 2 Conversion replies
    pdf.add_page()
    pdf.h1("2. How to respond for conversion")
    pdf.body(
        "Most conversions from social come from helpful replies, not polished ads. "
        "Use this ladder on every platform."
    )
    pdf.h3("Reply ladder")
    for i, t in enumerate(
        [
            "Answer the question with one concrete tip (name a criterion or give a before/after).",
            "Invite a small next step without selling (\"Paste one paragraph and I'll hint at the issue\").",
            "Only if they ask for tools / tutors / checkers - soft mention + disclosure.",
            "Place the link where the platform allows (bio, description, allowed comment). Never dump 5 links.",
            "Reply again when they respond. Conversations convert; hit-and-run does not.",
        ],
        start=1,
    ):
        pdf.bullet(f"Step {i}: {t}")

    pdf.h3("Disclosure (required when promoting)")
    pdf.quote(
        "Full disclosure: I'm affiliated with IELTS AI Tutor by IELTSGRADER (ieltsgrader.com)."
    )
    pdf.h3("Soft CTA (safe)")
    pdf.quote(
        "If you want criterion-by-criterion feedback in about a minute, we built a free "
        "evaluation at ieltsgrader.com - no pressure either way."
    )
    pdf.h3("Helpful reply without product")
    pdf.quote(
        "Your Task Response is clear, but paragraph 2 doesn't fully develop the idea - "
        "add a specific example. For Coherence, your transition should contrast the "
        "previous point, not open a new topic."
    )
    pdf.h3("When to link vs bio-only")
    pdf.table_row(["Situation", "Link placement"], [70, 120], header=True)
    pdf.table_row(
        ["They asked for a tool / checker / tutor", "One URL + disclosure (or bio if Reddit-strict)"],
        [70, 120],
    )
    pdf.table_row(
        ["General writing tip thread", "No link - teach; offer more help"],
        [70, 120],
    )
    pdf.table_row(
        ["Our own post / Short / Reel", "Bio + description / pinned comment"],
        [70, 120],
    )
    pdf.table_row(
        ["Platform bans outbound links in posts", "Link in bio only; say \"link in bio\""],
        [70, 120],
    )

    # 3 Cadence
    pdf.add_page()
    pdf.h1("3. Creating posts & frequency")
    pdf.body(
        "With one person covering eight platforms, repurpose ruthlessly: one short video "
        "becomes YouTube Short + TikTok + Instagram Reel with different captions."
    )
    pdf.h3("Cadence targets")
    w = [40, 70, 80]
    pdf.table_row(["Platform", "Create", "Engage"], w, header=True)
    rows = [
        ["Reddit", "1 value post / week", "Daily comments (value first)"],
        ["Quora", "3-5 answers / week", "Reply on your answers"],
        ["Twitter/X", "4-7 posts/threads / week", "Daily replies"],
        ["YouTube", "3-5 Shorts / week", "Daily comment replies"],
        ["Instagram", "3-5 Reels + Stories", "Comments + DMs"],
        ["TikTok", "3-5 videos / week", "Comment replies"],
        ["LinkedIn", "2-3 posts / week", "Comment on edtech/IELTS"],
        ["Facebook", "2-3 page posts / week", "Helpful group comments"],
    ]
    for r in rows:
        pdf.table_row(r, w)

    pdf.h3("Weekly rhythm")
    for t in [
        "Monday: Run the weekly discovery script; pick high-engagement threads to join.",
        "Tue-Thu: Publish scheduled content; hit daily Tier-1 replies (Reddit, Quora, X).",
        "Friday: Deep replies on the biggest threads of the week.",
        "Sunday: Scorecard - posts, replies, clicks, backlog for next week.",
    ]:
        pdf.bullet(t)

    # 4 Quality
    pdf.add_page()
    pdf.h1("4. Post quality & details")
    pdf.h3("Hooks that work for IELTS writing")
    for t in [
        "\"This Band 6 sentence is why you're stuck at 6.5.\"",
        "\"Task Response isn't grammar - here's the real issue.\"",
        "\"12 better alternatives to 'increased' for Task 1.\"",
        "\"Formal vs semi-formal GT letters in 30 seconds.\"",
    ]:
        pdf.bullet(t)
    pdf.h3("Structure")
    for t in [
        "Short-form video (45-60s): Hook -> problem sentence -> fix -> soft CTA.",
        "Text post: Claim -> one example -> checklist -> invitation to ask a question.",
        "Carousel / slides: Band 6 vs 7 side-by-side; one criterion per slide.",
        "Long answer (Quora/LinkedIn): Answer first, product last, disclose clearly.",
    ]:
        pdf.bullet(t)
    pdf.h3("Visual / production checklist")
    for t in [
        "Vertical 9:16 for Shorts / Reels / TikTok; burn-in captions (many watch muted).",
        "Brand feel: deep navy text overlays (#1a1f36) + clear blue accent (#3B82F6).",
        "Show real essay lines on screen - abstract tips underperform.",
        "Same edit -> three platforms; rewrite caption and hashtags per network.",
    ]:
        pdf.bullet(t)
    pdf.h3("Hashtags & tags")
    pdf.body(
        "Use 3-8 relevant tags, not 30. Prefer: #IELTS #IELTSWriting #Task2 #Band7 "
        "#StudyAbroad - mix with 1-2 niche tags. On LinkedIn, prefer @mentions over hashtags."
    )
    pdf.h3("Banned / cautious phrases")
    pdf.table_row(["Avoid", "Say instead"], [90, 100], header=True)
    pdf.table_row(["100% accurate", "Aligned with official band descriptors"], [90, 100])
    pdf.table_row(["Guaranteed Band 7", "Plan toward your target band"], [90, 100])
    pdf.table_row(["Best IELTS grader", "AI tutor with criterion-level feedback"], [90, 100])

    # 5 Trust
    pdf.add_page()
    pdf.h1("5. How to build trust")
    for t in [
        "Warm-up: On Reddit especially, comment helpfully for 1-2 weeks before product mentions.",
        "Consistency beats virality: show up daily on Tier 1 platforms.",
        "Proof > praise: show criterion breakdowns and before/after sentences, not fake 5-star walls.",
        "Honesty: admit AI limits; recommend human tutoring when that is better.",
        "Disclosure: always when you mention our product. Hidden promo destroys accounts.",
        "Respect rules: each subreddit, Facebook group, and Quora space has different promo norms.",
        "Never buy engagement, comments, or followers.",
        "Never argue with examiners, competitors, or frustrated students - stay calm and useful.",
    ]:
        pdf.bullet(t)

    # 6 Platform playbooks
    pdf.add_page()
    pdf.h1("6. Platform playbooks")

    platforms = [
        (
            "6.1 Facebook",
            [
                "Best for: study-abroad parents, GT candidates, local IELTS groups.",
                "Formats: short tips, carousel images, live Q&A occasionally; reuse Reels as Facebook video.",
                "Groups: answer sincerely; follow each group's promo rules. Prefer help over links.",
                "Page: 2-3 posts/week; pin a \"Start free evaluation\" post with clear value.",
                "Conversion: send to Profile / About link or comment link when the group allows; use disclosure.",
                "Gain most: join 3-5 active IELTS/study groups; become the person who gives criteria tips.",
            ],
        ),
        (
            "6.2 Instagram",
            [
                "Best for: visual band comparisons, Reels discovery, Stories for daily tips.",
                "Formats: Reels first; carousels second; Stories for polls (\"Band 6 or 7 intro?\").",
                "Link: link in bio (ieltsgrader.com). Say \"link in bio\" in captions - avoid raw URLs if they hurt reach.",
                "Cadence: 3-5 Reels/week aligned with YouTube/TikTok edit.",
                "Conversion: bio link + Stories swipe / link sticker when eligible; DM auto-reply optional with disclosure.",
                "Gain most: series content (\"Band 6 vs 7\" week) and reply to every comment with a mini-tip.",
            ],
        ),
        (
            "6.3 Reddit",
            [
                "Best for: highest-intent questions (\"grade my essay\", \"stuck at 6.5\").",
                "Subs: r/IELTS (primary), r/EnglishLearning, study-abroad / visa subs (careful).",
                "Formats: long value posts; detailed comments. Link dumps get removed or downvoted.",
                "Cadence: 1 value post/week + daily helpful comments. Karma before promo.",
                "Conversion: teach first. Mention product only when asked or highly relevant + disclose. Prefer bio/profile.",
                "Gain most: answer under high-upvote threads from the weekly CSV; offer to review one paragraph.",
                "See also: SEO/guides/REDDIT.md for ideas and templates.",
            ],
        ),
        (
            "6.4 Quora",
            [
                "Best for: evergreen SEO - answers rank for years.",
                "Formats: 300-800 word answers with structure (criteria headings, examples).",
                "Cadence: 3-5 quality answers/week; update old popular answers.",
                "Conversion: answer fully; add a short disclosure + link at the end if tool-relevant.",
                "Gain most: target questions like \"How can I check my IELTS essay?\" and \"IELTS writing feedback tools\".",
            ],
        ),
        (
            "6.5 Twitter / X",
            [
                "Best for: fast tips, threads, joining conversations with tutors and candidates.",
                "Formats: 1 tip + example; threads for Band 6 vs 7; quote-repost with added value.",
                "Cadence: 4-7 posts/week + daily replies.",
                "Conversion: link sparingly; pin a free-eval tweet; use bio link as default.",
                "Gain most: reply within hours to viral IELTS threads; be the clearest explainer, not the loudest.",
            ],
        ),
        (
            "6.6 LinkedIn",
            [
                "Best for: parents, teachers, education partners, professional credibility.",
                "Formats: 120-250 word posts with line breaks; story + lesson; soft CTA.",
                "Cadence: 2-3 posts/week; comment on IELTS / immigration / edtech posts.",
                "Conversion: link with disclosure in post or first comment; invite free evaluation.",
                "Gain most: thought leadership (\"What AI feedback should and should not claim\") builds trust faster than tips alone.",
            ],
        ),
        (
            "6.7 TikTok",
            [
                "Best for: short discovery; same edit as Shorts/Reels.",
                "Formats: hook in 1s; on-screen essay text; captions native style (line breaks, light humor).",
                "Cadence: 3-5/week. Link in bio.",
                "Conversion: \"free essay check - link in bio\"; pin a comment with soft CTA + disclosure.",
                "Gain most: trend audio only if on-brand; otherwise speak clearly over simple B-roll of text edits.",
            ],
        ),
        (
            "6.8 YouTube",
            [
                "Best for: authority + searchable how-tos; Shorts for reach.",
                "Formats: Shorts 45-60s; optional longer walkthroughs of sample essays.",
                "Cadence: 3-5 Shorts/week; reply to comments daily.",
                "Description: include ieltsgrader.com + free eval CTA; pin comment with link.",
                "Conversion: end every Short with spoken CTA; \"Get full criterion feedback free - link below.\"",
                "Gain most: series (Band 6 vs 7, Task 1 verbs, GT tone). See SEO/guides/YOUTUBE_SHORTS.md.",
            ],
        ),
    ]

    for title, bullets in platforms:
        pdf.h2(title)
        for b in bullets:
            pdf.bullet(b)

    # 7 Listening scripts
    pdf.add_page()
    pdf.h1("7. Weekly listening (discovery scripts)")
    pdf.body(
        "Every Monday, run the weekly script so you know where IELTS grading/tutor "
        "conversations happened in the last 7 days. Also use the historical CSV to find "
        "evergreen high-engagement threads worth learning from (not spamming)."
    )
    pdf.h3("Commands")
    pdf.body(
        "cd SEO/social-media/scripts\n"
        "pip install -r requirements.txt\n"
        "cp .env.example .env   # add SERPER_API_KEY and YOUTUBE_API_KEY\n"
        "python3 search_weekly.py\n"
        "python3 search_historical.py   # occasional / onboarding"
    )
    pdf.body(
        "CSVs include: platform, url, title, snippet, published_at, engagement fields "
        "when available (Reddit/YouTube), query, source. Prioritize rows with high "
        "engagement_score. Serper-sourced platforms may show engagement_unknown - "
        "still useful for finding public posts to engage with thoughtfully."
    )

    # 8 Scorecard
    pdf.h1("8. Weekly scorecard")
    sw = [90, 100]
    pdf.table_row(["Metric", "Starting target"], sw, header=True)
    for r in [
        ["Helpful replies (all platforms)", ">= 50 / week"],
        ["Original posts / Shorts (with repurposing)", ">= 12 / week"],
        ["High-intent threads engaged (from CSV)", ">= 10 / week"],
        ["Bio / profile link clicks", "Track in Insights"],
        ["Free evaluations from social", "Track UTMs if used"],
    ]:
        pdf.table_row(r, sw)

    pdf.ln(6)
    pdf.h2("Remember")
    pdf.body(
        "Value first. Disclose when you promote. No guarantees. Teach so well that "
        "students ask for the tool - then convert with one clear link to ieltsgrader.com."
    )

    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
