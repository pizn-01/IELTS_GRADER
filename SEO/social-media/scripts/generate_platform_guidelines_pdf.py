#!/usr/bin/env python3
"""
Generate PLATFORM_GUIDELINES.pdf - per-platform identity + posting rules
(ban-safe Social Ops). Run: python3 generate_platform_guidelines_pdf.py
"""

from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent.parent / "PLATFORM_GUIDELINES.pdf"


class GuidePDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(
            0,
            8,
            "IELTSGRADER Social Ops - Platform Guidelines (ban-safe)",
            align="L",
        )
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
            f"Page {self.page_no()}/{{nb}}  |  Internal - do not share externally",
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
        self.ln(4)
        self._reset_x()
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(26, 31, 54)
        self.multi_cell(0, 8, text)
        self.ln(1)
        self.set_draw_color(59, 130, 246)
        y = self.get_y()
        self.line(self.l_margin, y, self.l_margin + 40, y)
        self.ln(4)
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

    def never(self, text: str) -> None:
        self._reset_x()
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(180, 40, 40)
        self.multi_cell(0, 5.5, f"  NEVER:  {text}")
        self._reset_x()

    def ok(self, text: str) -> None:
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(20, 90, 50)
        self.multi_cell(0, 5.5, f"  OK:  {text}")
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


def _identity_block(
    pdf: GuidePDF,
    *,
    account_type: str,
    username: str,
    display_name: str,
    photo: str,
    bio: str,
    website_field: str,
) -> None:
    pdf.h3("Account identity")
    pdf.bullet(f"Account type: {account_type}")
    pdf.bullet(f"Username / handle: {username}")
    pdf.bullet(f"Display name: {display_name}")
    pdf.bullet(f"Profile photo: {photo}")
    pdf.bullet(f"Bio / About: {bio}")
    pdf.bullet(f"Website / link field: {website_field}")


def build() -> Path:
    pdf = GuidePDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # ----- Cover -----
    pdf.h1("Platform Guidelines")
    pdf.body("IELTS AI Tutor by IELTSGRADER - Social Ops (ban-safe edition)")
    pdf.body(
        "How to set up and act on each platform. Goal: promote ieltsgrader.com "
        "without Reddit bans or LinkedIn comment blocks. Reddit does NOT say "
        "the brand name. Quora / YouTube / IG / TikTok / bios do - that is "
        "where people learn 'ieltsgrader' and click the site."
    )
    pdf.callout(
        "North star",
        "Trust first -> free evaluation -> visits to ieltsgrader.com. "
        "Brand name memory comes from branded channels (Quora/YouTube/bios), "
        "not from a neutral Reddit username. Never optimize for link dumps "
        "in Reddit or LinkedIn comments.",
    )
    pdf.h3("Two identities (use both)")
    pdf.bullet(
        "Community identity (Reddit + LinkedIn comments): neutral human tutor. "
        "No 'IELTS' + 'grader/tutor/AI' in the username. No brand logo as avatar."
    )
    pdf.bullet(
        "Brand identity (YouTube, Instagram, TikTok, LinkedIn Company Page, "
        "site): IELTSGRADER / IELTS AI Tutor - promo expected here."
    )
    pdf.h3("Where soft CTAs + URLs are allowed")
    pdf.ok("Quora, Twitter/X, YouTube (comments/answers when intent fits); IG/TikTok via bio")
    pdf.never("Reddit comments - no product, no brand tokens, no URLs")
    pdf.never(
        "LinkedIn comments - no product, no disclosure boilerplate, no raw URLs "
        "(LinkedIn blocks this pattern)"
    )
    pdf.h3("Banned phrases in no-CTA contexts")
    pdf.bullet("ieltsgrader / ieltsgrader.com / IELTS AI Tutor")
    pdf.bullet("free evaluation / Full disclosure / I'm affiliated")
    pdf.bullet("Any raw http(s) link in the comment")

    # ----- PRIORITY PAGE (1 page) -----
    pdf.add_page()
    pdf.h2("Effort priority: promotion, referral, SEO")
    pdf.body(
        "Based on ban/block feedback (Reddit Rule 1+14, LinkedIn comment spam "
        "filter): put time where you can name IELTSGRADER and link safely. "
        "Do not spend promo energy on Reddit/LinkedIn comments."
    )
    pdf.h3("P0 - Spend most time here (promotion + SEO + referral)")
    pdf.bullet(
        "Quora: Best mix. Long answers get indexed (SEO). Soft CTA + disclosure "
        "+ UTM when they ask for tools/feedback (promotion). Ask readers to "
        "share the free check with classmates (referral). Target: several "
        "strong answers per week."
    )
    pdf.bullet(
        "YouTube (Shorts + description + pinned comment): Names the brand, "
        "links the site (promotion). Search + suggested traffic (SEO). End "
        "screens / pinned 'share with a study partner' (referral). Target: "
        "3-5 Shorts/week from one edit."
    )
    pdf.bullet(
        "Owned site / blog (from Social Ops themes): Ranks for 'IELTS essay "
        "checker' style queries (SEO). Primary conversion. Add referral/"
        "share hooks on success screens separately in product."
    )
    pdf.h3("P1 - Steady secondary (promotion; lighter SEO)")
    pdf.bullet(
        "Instagram + TikTok: Same Short as YouTube. Promotion via link in bio "
        "only. Weak for classic SEO; strong for awareness + bio clicks. "
        "Referral: Stories 'send to a friend preparing IELTS'."
    )
    pdf.bullet(
        "Twitter/X: Fast replies; bio link always on. In-reply URL only on "
        "tool asks. Modest SEO. Good for repeating brand name safely."
    )
    pdf.bullet(
        "LinkedIn (owned posts + profile Website/Featured only): Soft CTA "
        "via profile, not comments. Parents/teachers audience. Skip rival "
        "AI-tool comment threads (blocked pattern)."
    )
    pdf.h3("P2 - Presence only (almost no direct promotion)")
    pdf.bullet(
        "Reddit: Help only. Zero links/brand in comments. Optional profile "
        "bridge to Quora/YouTube. Does NOT create 'ieltsgrader' search demand "
        "by itself. Cap time: enough to stay useful, not your promo engine."
    )
    pdf.bullet(
        "LinkedIn comments: Insight only - same as Reddit for links. Do not "
        "chase referral or SEO here."
    )
    pdf.bullet(
        "Facebook Groups: Warmup/value first; Page website for promo. Low "
        "priority vs Quora/YouTube."
    )
    pdf.h3("Weekly time split (one person)")
    pdf.bullet("About 45%: Quora answers + YouTube Shorts/descriptions (P0)")
    pdf.bullet("About 25%: IG/TikTok captions + X replies + LinkedIn owned posts (P1)")
    pdf.bullet("About 20%: Reddit value comments with neutral account (P2 presence)")
    pdf.bullet("About 10%: Theme notes -> blog / next week's create pack")
    pdf.callout(
        "Measure what matters",
        "Promotion: Quora/YouTube/X UTMs + bio clicks. Referral: invite/"
        "share events on site or 'send to a friend' CTAs on YT/IG. SEO: GSC "
        "clicks to blog/checkers + Quora-referred search. Do NOT measure "
        "success by Reddit or LinkedIn comment link CTR.",
    )

    # ----- REDDIT -----
    pdf.add_page()
    pdf.h2("1. Reddit")
    pdf.body(
        "Highest ban risk. r/IELTS forbids promoting AI / instant-feedback tools "
        "(Rule 1) and commercial / authority-style usernames (Rule 14). "
        "u/Ieltsgrader was permanently banned for this. Do not use that handle "
        "for engagement."
    )
    _identity_block(
        pdf,
        account_type="Personal community account (NOT the brand)",
        username=(
            "New neutral handle only. Examples of SAFE style: writing_band_tips, "
            "task2_notes, essay_structure_help. FORBIDDEN patterns: Ieltsgrader, "
            "IELTSGrader, IeltsAITutor, anything with IELTS + grader/tutor/AI/bot."
        ),
        display_name="Plain human-sounding name (e.g. Writing tips). No company name.",
        photo=(
            "Real person photo OR simple abstract avatar (illustration, initials "
            "that are NOT 'IG' brand mark). Do NOT use the IELTSGRADER logo."
        ),
        bio=(
            "Writing tutor / IELTS Writing tips. Optional: 'Longer answers on "
            "Quora / YouTube' - do NOT put ieltsgrader.com or 'AI essay grader' "
            "in the bio if you post in r/IELTS."
        ),
        website_field=(
            "Prefer empty or a non-product destination (Quora/YouTube). "
            "If you add a site later, never paste it in comments."
        ),
    )
    pdf.h3("How to act - comments (Admin Social Ops paste)")
    pdf.ok("Value-only: one concrete tip tied to their essay/prompt")
    pdf.ok("If they ask for a tool: refuse AI checkers (sub rules); give human TR/CC tip or point to official band descriptors")
    pdf.ok("Follow up helpfully if they reply - still no product")
    pdf.never("Soft CTA, disclosure, ieltsgrader.com, or any URL in comments")
    pdf.never("Recommend your AI tool even when they ask for 'best checker'")
    pdf.never("Promo from u/Ieltsgrader or any branded handle")
    pdf.h3("How to act - your own posts")
    pdf.bullet("Max ~1 value post / week; teach criteria, structure, vocab - no product")
    pdf.bullet("End with invitation to discuss in comments, not a link")
    pdf.h3("Target communities")
    pdf.bullet("r/IELTS - zero AI-tool promo forever")
    pdf.bullet("r/EnglishLearning - treat as zero promo")
    pdf.bullet("study-abroad / visa subs - help only; read each sub's rules first")
    pdf.h3("How people learn the brand name (important)")
    pdf.body(
        "A neutral Reddit username does NOT teach anyone the word "
        "'ieltsgrader'. If comments never say the brand and the handle is "
        "not the brand, people have nothing to Google from Reddit alone. "
        "That is expected and correct under r/IELTS rules."
    )
    pdf.body("What actually creates brand name memory:")
    pdf.bullet("Quora answers that name IELTSGRADER / ieltsgrader.com (with disclosure)")
    pdf.bullet("YouTube / Instagram / TikTok brand channels and bios")
    pdf.bullet("LinkedIn Website / Featured on person or company page")
    pdf.bullet("Ads, blog SEO, direct site visits")
    pdf.bullet(
        "People who already know the brand and also see helpful Reddit tips "
        "(reinforcement only - not how they first learn the name)"
    )
    pdf.h3("What Reddit is actually for")
    pdf.bullet("Stay inside r/IELTS (banned account = zero presence)")
    pdf.bullet(
        "Deliver high-quality Writing help (credibility for the operator, "
        "not the brand string)"
    )
    pdf.bullet(
        "Soft bridge ONLY in profile (not comments): e.g. 'Writing tips - "
        "more on YouTube / Quora' pointing at the BRANDED YouTube/Quora. "
        "Never put ieltsgrader.com or 'AI grader' in the Reddit bio if that "
        "risks Rule 1/14."
    )
    pdf.bullet(
        "Feed topic ideas into Quora/YouTube/blog that DO rank and name "
        "the product"
    )
    pdf.bullet(
        "If someone DMs 'do you tutor / have a site?' - answer off-comment "
        "carefully; still avoid spammy link blasts"
    )
    pdf.h3("Bridge path (how Reddit can still help conversion)")
    pdf.body(
        "Reddit help -> (optional) student opens Reddit profile -> sees "
        "Quora/YouTube -> branded channel names IELTSGRADER and links "
        "ieltsgrader.com. Many students never open the profile; that is fine. "
        "Most site clicks still come from Quora/YouTube/bios directly the "
        "same week - Reddit is not the main click path."
    )
    pdf.h3("Concrete example")
    pdf.bullet(
        "Reddit comment: human tip only - no brand, no URL (even if they ask "
        "for a checker)"
    )
    pdf.bullet(
        "Curious student opens profile -> 'more tips on YouTube: IELTSGRADER' "
        "-> Short that says free check at ieltsgrader.com"
    )
    pdf.bullet(
        "Or they never click profile - you still convert other students on "
        "Quora/YouTube that week"
    )
    pdf.h3("Give up vs keep")
    pdf.bullet("GIVE UP: Reddit comments that mint the brand name or drop the URL")
    pdf.bullet(
        "GIVE UP: expecting people to Google 'ieltsgrader' only because they "
        "saw a neutral u/ handle"
    )
    pdf.bullet(
        "KEEP: access to the community + profile bridge to branded channels "
        "+ content ideas"
    )
    pdf.bullet(
        "KEEP: real naming + links on Quora / YouTube / bios where rules allow"
    )
    pdf.callout(
        "One-liner",
        "Reddit does not say the brand; Quora/YouTube/bios do. Reddit only "
        "keeps you present and may send a few people to those branded "
        "channels via profile.",
    )
    pdf.callout(
        "Appeal note",
        "Unban under u/Ieltsgrader will still fail Rule 14 (username). "
        "Use a new neutral account. Acknowledge Rule 1 + 14; do not promise "
        "'less promo' under the branded handle.",
    )

    # ----- LINKEDIN -----
    pdf.add_page()
    pdf.h2("2. LinkedIn")
    pdf.body(
        "Confirmed failure mode: commenting under another AI IELTS post with "
        "soft CTA + ieltsgrader.com + 'Full disclosure: I'm affiliated...' from a "
        "brand-looking profile. LinkedIn returns: 'Your comment could not be "
        "created at this time.' Treat comments like Reddit: teach only."
    )
    pdf.h3("Use TWO LinkedIn surfaces")
    pdf.bullet(
        "Person profile - ALL comments and most organic discussion. Educator, not a bot."
    )
    pdf.bullet(
        "Company Page (IELTSGRADER) - owned brand posts only. Do not use the "
        "Company Page (or brand 'IG' logo avatar) to spam comments on others' posts."
    )
    _identity_block(
        pdf,
        account_type="Person profile for engage; Company Page for brand create",
        username=(
            "Person: real first + last name URL (linkedin.com/in/your-name). "
            "Not 'ieltsgrader' as the public identity for commenting."
        ),
        display_name=(
            "Person headline example: 'IELTS Writing coach | Task 1 & 2 feedback'. "
            "Avoid 'AI Grader' / 'IELTSGRADER official' on the person profile used for comments."
        ),
        photo=(
            "Person: clear headshot of a real person. "
            "Company Page: brand logo OK. "
            "Do NOT comment from an account whose avatar is only the 'IG' brand mark if that account is used for cold outreach comments."
        ),
        bio=(
            "About: teaching IELTS Writing, criteria (TR/CC/LR/GRA), study plans. "
            "Website field on the person profile may list ieltsgrader.com with UTM "
            "(this is the conversion path - not comments)."
        ),
        website_field=(
            "Put https://ieltsgrader.com/?utm_source=linkedin&utm_medium=social"
            "&utm_campaign=organic_profile in Website and/or Featured. "
            "Never paste that URL into comments."
        ),
    )
    pdf.h3("How to act - comments on others' posts")
    pdf.ok("Short professional insight only (structure, criteria, one fix)")
    pdf.never("Raw URLs, ieltsgrader.com, lnkd.in promo dumps")
    pdf.never("Full disclosure / I'm affiliated / free evaluation boilerplate")
    pdf.never("Reply-promo under competitor or other AI-tool marketing posts - skip those threads")
    pdf.h3("How to act - your own posts (Company or person)")
    pdf.bullet("Post A (education): pure teaching - no URL, no disclosure")
    pdf.bullet(
        "Post B (soft CTA): say 'link in my profile / Featured' - do NOT paste "
        "raw ieltsgrader.com in the post body"
    )
    pdf.bullet(
        "After a comment block: stop, strip links/disclosure, wait before posting "
        "again. Do not retry the same promo paste."
    )
    pdf.h3("Conversion path")
    pdf.body(
        "Profile Website / Featured clicks + owned posts. Measure profile visits, "
        "not comment link CTR."
    )

    # ----- QUORA -----
    pdf.add_page()
    pdf.h2("3. Quora")
    pdf.body(
        "Primary SEO + promo surface. Long-lived answers get indexed. Soft CTA "
        "+ disclosure + one allowlisted URL is appropriate when the question "
        "asks for tools, checkers, or feedback options."
    )
    _identity_block(
        pdf,
        account_type="Personal space / writer profile (can be lightly branded)",
        username="Real name or clear tutor name. Avoid spammy keyword stuffing.",
        display_name="Name + optional 'IELTS Writing' - disclosure when you promote.",
        photo="Real person headshot preferred (builds trust for long answers).",
        bio=(
            "IELTS Writing tutor. When relevant: affiliated with IELTS AI Tutor "
            "by IELTSGRADER (ieltsgrader.com)."
        ),
        website_field="https://ieltsgrader.com (or UTM link) in profile credentials / spaces as allowed.",
    )
    pdf.h3("How to act")
    pdf.ok("Detailed, specific answers - criteria, examples, before/after lines")
    pdf.ok(
        "When they ask for a tool/checker/tutor: soft CTA + disclosure + one "
        "ieltsgrader.com UTM link"
    )
    pdf.ok("Reply to comments on your answers; keep teaching")
    pdf.never("Answer every question with the same paste-link template")
    pdf.never("Guarantee Band 7 or '100% accurate'")
    pdf.h3("Disclosure line (when promoting)")
    pdf.body(
        'Full disclosure: I\'m affiliated with IELTS AI Tutor by IELTSGRADER '
        "(ieltsgrader.com)."
    )
    pdf.h3("Conversion path")
    pdf.body("Direct UTM clicks + Google indexing of answers. Track utm_source=quora.")

    # ----- TWITTER / X -----
    pdf.add_page()
    pdf.h2("4. Twitter / X")
    pdf.body(
        "Fast discourse. Soft CTA allowed when someone asks for tools; otherwise "
        "teach. Prefer bio link over dumping URLs in every reply."
    )
    _identity_block(
        pdf,
        account_type="Brand or person - pick one and stay consistent",
        username="@ handle without looking like an official IELTS exam account",
        display_name="IELTS Writing tips / IELTSGRADER - clear you are a product/tutor brand if brand account",
        photo="Brand logo OK on brand account; person photo on person account",
        bio="IELTS Writing help. Free band breakdown: link in bio. Be honest you build a tutor product if brand.",
        website_field="Bio link -> https://ieltsgrader.com/?utm_source=twitter&utm_medium=social&utm_campaign=organic_bio",
    )
    pdf.h3("How to act")
    pdf.ok("Short tips, threads, reply to students/tutors with one concrete fix")
    pdf.ok("Tool ask -> one URL + short disclosure")
    pdf.ok("Otherwise -> teach; point to bio if needed")
    pdf.never("Mass-reply the same CTA under every #IELTS post")
    pdf.h3("Conversion path")
    pdf.body("Bio clicks + occasional in-reply link on tool asks. Track utm_source=twitter.")

    # ----- YOUTUBE -----
    pdf.add_page()
    pdf.h2("5. YouTube")
    pdf.body(
        "Authority + Shorts discovery. Promo belongs in description and pinned "
        "comment - expected by viewers."
    )
    _identity_block(
        pdf,
        account_type="Brand channel",
        username="IELTSGRADER or IELTS AI Tutor by IELTSGRADER",
        display_name="IELTS AI Tutor by IELTSGRADER",
        photo="Brand logo / channel art matching site (navy #1a1f36, blue #3B82F6)",
        bio="AI writing tutor: criterion feedback, fix cards, study plans. Link below.",
        website_field="Channel links + every description: ieltsgrader.com with UTM",
    )
    pdf.h3("How to act")
    pdf.ok("45-60s Shorts: one writing fix, spoken CTA OK")
    pdf.ok("Description: soft CTA + https://ieltsgrader.com/?utm_source=youtube...")
    pdf.ok("Pinned comment: free evaluation invite + link")
    pdf.ok("Reply to comments with teaching; link again only if asked")
    pdf.never("Fake 'student story' guarantees or official IELTS affiliation claims")
    pdf.h3("Conversion path")
    pdf.body("Description + pinned comment clicks. Strong for SEO and branded search.")

    # ----- INSTAGRAM -----
    pdf.add_page()
    pdf.h2("6. Instagram")
    pdf.body("Same Short assets as Reels. Links live in bio - not in caption URLs.")
    _identity_block(
        pdf,
        account_type="Brand business/creator account",
        username="@ieltsgrader or similar brand handle (OK here - not Reddit)",
        display_name="IELTSGRADER | IELTS AI Tutor",
        photo="Brand logo; feed aesthetic consistent with site",
        bio="IELTS Writing in 60s feedback. Free check -> link in bio.",
        website_field="Link in bio / Linktree -> ieltsgrader.com UTM (utm_source=instagram)",
    )
    pdf.h3("How to act")
    pdf.ok("Reels + Stories from the same Short edit; captions teach one tip")
    pdf.ok("Say 'link in bio' - never raw URLs in caption if avoidable")
    pdf.ok("Reply to DMs/comments with help; send link only when asked")
    pdf.never("Comment-spam other IELTS accounts with your link")
    pdf.h3("Conversion path")
    pdf.body("Bio link clicks. Track Instagram Insights + UTM.")

    # ----- TIKTOK -----
    pdf.add_page()
    pdf.h2("7. TikTok")
    pdf.body("Native short-form; same creative as YouTube Shorts / Reels with TikTok tone.")
    _identity_block(
        pdf,
        account_type="Brand creator account",
        username="Brand handle (ieltsgrader style OK)",
        display_name="IELTSGRADER",
        photo="Brand logo or friendly face + brand consistency",
        bio="IELTS Writing fixes. Free essay check - link in bio.",
        website_field="Bio link -> ieltsgrader.com UTM (utm_source=tiktok)",
    )
    pdf.h3("How to act")
    pdf.ok("Native caption style; on-screen hook; 'link in bio'")
    pdf.ok("Reply to comments with micro-tips")
    pdf.never("External link spam in comments on others' videos")
    pdf.h3("Conversion path")
    pdf.body("Bio link. Track utm_source=tiktok.")

    # ----- FACEBOOK -----
    pdf.add_page()
    pdf.h2("8. Facebook")
    pdf.body(
        "Page for brand posts; Groups are often anti-promo. Warm up with value "
        "before any product mention (SOCIAL_WARMUP mindset)."
    )
    _identity_block(
        pdf,
        account_type="Facebook Page (brand) + careful personal use in Groups",
        username="Page: IELTSGRADER / IELTS AI Tutor",
        display_name="IELTSGRADER",
        photo="Brand logo on Page",
        bio="AI writing tutor for IELTS Task 1 & 2. Free evaluation on our site.",
        website_field="Page website -> ieltsgrader.com UTM (utm_source=facebook)",
    )
    pdf.h3("How to act")
    pdf.ok("Page posts: short tips for GT / study-abroad parents")
    pdf.ok("Groups: read rules; help first; link only if group allows and asked")
    pdf.never("Drop the same link in multiple groups the same day")
    pdf.never("During warmup: zero product mentions in Groups")
    pdf.h3("Conversion path")
    pdf.body("Page website clicks + rare group-safe mentions with disclosure.")

    # ----- Operator checklist -----
    pdf.add_page()
    pdf.h2("9. Daily operator checklist")
    pdf.bullet("Paste only Admin Social Ops drafts that match the platform rules above")
    pdf.bullet("If a draft has a link/disclosure on Reddit or LinkedIn comments - do not post; mark for rewrite")
    pdf.bullet("Mark Done / Wait for reply / Dead so threads are not reworked blindly")
    pdf.bullet("Once a thread is pending or done, weekly runs must not suggest it again (memory)")
    pdf.bullet(
        "Measure: Quora/YouTube/X UTMs, bio clicks, GSC branded queries from "
        "branded channels - not Reddit comment CTR (neutral Reddit names do "
        "not create 'ieltsgrader' search demand by themselves)"
    )
    pdf.h3("Disclosure (allowed platforms only)")
    pdf.body(
        'Full disclosure: I\'m affiliated with IELTS AI Tutor by IELTSGRADER '
        "(ieltsgrader.com)."
    )
    pdf.h3("Soft CTA example (Quora / X / YouTube - paraphrase)")
    pdf.body(
        "If you want criterion-by-criterion feedback in about a minute, we built "
        "a free evaluation at ieltsgrader.com - no pressure either way."
    )
    pdf.callout(
        "Remember",
        "Reddit does not say the brand; Quora/YouTube/bios do. "
        "Reddit/LinkedIn comments = help + stay unbanned (+ optional profile "
        "bridge). Quora + YouTube + X + bios = name IELTSGRADER and link "
        "ieltsgrader.com. Never mix those playbooks.",
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
