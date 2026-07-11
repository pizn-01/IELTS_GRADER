# Content Calendar — Phase 2

**Status:** 26 published posts in `ielts-grader-app/src/content/blog/`

## Phase 1 posts (deepened)

All week 1–8 posts expanded to production depth (guides 900–1500 words; samples with full essays).

## Phase 2 new posts

| Slug | Topic |
|------|-------|
| `ielts-writing-error-taxonomy` | Mistakes by criterion |
| `dual-ai-grading-explained` | Dual-model trust |
| `task-response-vs-achievement` | TR vs TA |
| `mock-exam-to-14-day-sprint` | Product journey |
| `personalized-learning-editions-guide` | Learning editions |
| `academic-vs-general-training-writing` | Academic vs GT |
| `lexical-resource-band-6-to-7` | Collocations |
| `handwritten-essay-ocr-tips` | OCR / handwriting |
| `ielts-writing-practice-plans-explained` | Plans educational |
| `stuck-at-band-6-5-plateau` | Plateau / Tutor’s Verdict |

## Ops

After adding posts:

```bash
python3 SEO/scripts/generate_sitemap.py
python3 SEO/scripts/validate_frontmatter.py
```
