# portugal-tax-calculator

## Analytics

The app supports optional Google Analytics 4 and Microsoft Clarity tracking without extra npm packages.

Add these environment variables in Vercel or in a local `.env.local`:

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_ID=your_clarity_project_id
```

GA4 is used for page views and product events. Clarity is optional and can help spot UX friction through heatmaps/session recordings.

Tracked events avoid exact income values and use income buckets instead:

- `income_period_change`
- `activity_year_change`
- `activity_type_change`
- `nhr_toggle`
- `tax_detail_tab_change`
- `usd_toggle`
