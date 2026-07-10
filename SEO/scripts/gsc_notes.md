# GSC CSV Export Notes

## How to export

1. Google Search Console → **Performance**
2. Set date range (last 28 days)
3. Choose **Pages** or **Queries** tab
4. Click **Export** → Download CSV

## Analyze locally

```bash
python3 SEO/scripts/gsc_summarize.py ~/Downloads/Pages.csv
python3 SEO/scripts/gsc_summarize.py ~/Downloads/Queries.csv
```

## What to look for

- **High impressions, low CTR** → rewrite title/meta (task F4)
- **Position 8–15** → add internal links + expand content
- **Queries you don't have pages for** → new blog or tool page

## File naming

Store exports in `SEO/data/gsc/` (create folder when needed):
- `YYYY-MM-DD-pages.csv`
- `YYYY-MM-DD-queries.csv`

Do not commit exports if they contain sensitive data — add to `.gitignore` if needed.
