# SQL Extra Space Remover (Netlify-ready)

Minimal static site + Netlify Function to store a single saved query (always replaces previous).

## Files
- `index.html` — the static site (already updated with Save / Load buttons).
- `netlify/functions/query.js` — Netlify Function that stores the latest query in Netlify Blobs under store `queries`, key `latest`.
- `README.md` — this file.

## Deploy on Netlify (quick)
1. Create a GitHub repo and push these files (place `index.html` at repo root; `netlify/functions/query.js` in that path).
2. Connect the repo to Netlify (Sites → New site from Git).
3. Netlify will build and deploy. The function will be available at:
   `https://<your-site>/.netlify/functions/query`

## Protecting writes (recommended)
- In Netlify Dashboard → Site settings → Environment variables, add:
  - `NETLIFY_SAVE_TOKEN` = some-secret-string
- Update the frontend to send this token header when saving, or use server-side checks. In the provided function, POST requires the header `x-admin-token` (if the env var is set). For simplicity the shipped `index.html` does not embed the token client-side. You can:
  - Manually add a small client-side token (not secure), or
  - Use Netlify Identity to authenticate users (recommended for production).

## Notes
- This uses Netlify Blobs (small key/value storage). It stores only a single JSON blob (`latest`) so storage size stays constant.
- If you prefer Supabase/Firebase/Airtable for future features (history, indexing), I can provide a replacement function.
