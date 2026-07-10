# Weekly SEO Measurement Scorecard

Copy this table each Monday. Export GSC data: Performance → Pages / Queries → Export.

## Week of: ___________

### Search Console

| Metric | This week | Last week | Δ |
|--------|-----------|-----------|---|
| Total impressions | | | |
| Total clicks | | | |
| Average CTR | | | |
| Average position | | | |
| Indexed pages | | | |

### Top 5 queries (by impressions)

| Query | Impressions | Clicks | CTR | Position |
|-------|-------------|--------|-----|----------|
| 1. | | | | |
| 2. | | | | |
| 3. | | | | |
| 4. | | | | |
| 5. | | | | |

### Top 5 pages (by clicks)

| Page | Clicks | Impressions | CTR |
|------|--------|-------------|-----|
| 1. | | | |
| 2. | | | |
| 3. | | | |
| 4. | | | |
| 5. | | | |

### Conversion (organic)

| Metric | Value |
|--------|-------|
| Organic sessions (analytics) | |
| Free evaluations started | |
| Signups from organic | |
| Blog → signup rate | |

### Actions this week

- [ ] GSC + Bing checked
- [ ] New content published: ___________
- [ ] Titles/meta updated for low-CTR pages: ___________
- [ ] Internal links added to new posts
- [ ] External activity (Reddit, directories, etc.): ___________

### Low-CTR rewrite candidates

Pages with impressions > 100 and CTR < 2%:

| URL | Impressions | CTR | Proposed new title |
|-----|-------------|-----|-------------------|
| | | | |

---

## Analyze GSC export

```bash
python3 SEO/scripts/gsc_summarize.py path/to/gsc-export.csv
```

## Monthly review

- Which clusters gained position?
- Which tool page converts best?
- Add 2 posts to winning cluster next month
- Prune or merge zero-impression posts after 90 days
