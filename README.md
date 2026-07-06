# Personal Dashboard

A set of small, self-contained HTML apps that share a top bar.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRowanThistlebrooke%2FYTdashh1)

One click → Vercel signs you in, copies the repo to your GitHub, and deploys it. ~30 seconds to a live URL.

## How to use

Open any `.html` file directly in your browser — no build step, no install.

| File | What it is |
|---|---|
| [index.html](index.html) | Goals tracker (Day Ring, Goal Ticker, To Do list) — the home page |
| [health.html](health.html) | Supplement / daily stack tracker |
| [po-water.html](po-water.html) | Water intake tracker |
| [finance.html](finance.html) | Finances |
| [gym.html](gym.html) | Progressive overload gym tracker |
| [topbar.js](topbar.js) | Shared top bar — auto-injected into pages that `<script src="topbar.js">` |
| [api/whoop-token.js](api/whoop-token.js) | Vercel serverless function — WHOOP OAuth token exchange/refresh (keeps the client secret server-side) |

Each app stores its own state in browser `localStorage`. No accounts, no server.

## Supabase setup (optional cloud sync)

Cross-device sync (goals, stack, water, finance, and gym state) relies on a `public.app_state` table with RLS policies allowing anon select/insert/update, keyed by page. Set that up first via the Supabase SQL Editor, then paste your project URL + publishable key into `topbar.js`, `gym.html`, and `sync.js`.

Gym progress photos additionally sync via Supabase Storage (instead of embedding base64 images in the `app_state` row). Run this in the SQL Editor to create the bucket and its access policies:

```sql
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "anon upload progress-photos" on storage.objects;
drop policy if exists "anon read progress-photos"   on storage.objects;
drop policy if exists "anon delete progress-photos" on storage.objects;

create policy "anon upload progress-photos"
  on storage.objects for insert with check (bucket_id = 'progress-photos');

create policy "anon read progress-photos"
  on storage.objects for select using (bucket_id = 'progress-photos');

create policy "anon delete progress-photos"
  on storage.objects for delete using (bucket_id = 'progress-photos');
```

## WHOOP integration setup

The WHOOP card at the top of `health.html` connects via OAuth to WHOOP's API. Token exchange/refresh runs through `api/whoop-token.js`, a Vercel serverless function — this keeps the WHOOP **Client Secret** out of the repo entirely.

1. Create an app at [developer.whoop.com](https://developer.whoop.com), with the redirect URL set to your deployed `index.html` (e.g. `https://your-app.vercel.app/index.html`).
2. In your Vercel project: **Settings → Environment Variables**, add:
   - `WHOOP_CLIENT_SECRET` — required. Never put this in any file in the repo.
   - `WHOOP_CLIENT_ID` / `WHOOP_REDIRECT_URI` — optional; the frontend already sends both explicitly, these only serve as a fallback.
3. Update the hardcoded `WHOOP_CLIENT_ID` and `WHOOP_REDIRECT_URI` constants near the top of the WHOOP `<script>` block in `health.html` to match your own app (client ID isn't secret, safe to commit).
4. Redeploy so the new env var takes effect.

Data field names in the fetch/render code follow WHOOP API v2 as of when this was written — if a stat shows `—`, check developer.whoop.com/docs for any field/endpoint renames.

## Building from scratch

[BUILD_DASHBOARD.md](BUILD_DASHBOARD.md) is the prompt I gave Claude to generate `index.html` — paste it into Claude if you want to rebuild that page yourself.
