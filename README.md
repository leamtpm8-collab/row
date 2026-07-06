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
| [api/whoop-callback.js](api/whoop-callback.js) | Vercel serverless function — WHOOP OAuth redirect target; exchanges the code server-side, forwards tokens to `health.html` via URL hash |
| [api/whoop-refresh.js](api/whoop-refresh.js) | Vercel serverless function — refreshes an expired WHOOP access token |
| [api/whoop-data.js](api/whoop-data.js) | Vercel serverless function — proxies WHOOP API v1/v2 calls (adds no secrets, just forwards the bearer token) |

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

The WHOOP card at the top of `health.html` connects via OAuth to WHOOP's API. The flow:

1. "Connect WHOOP" redirects the browser to WHOOP's OAuth page.
2. WHOOP redirects back to `api/whoop-callback.js`, which exchanges the code for tokens **server-side** (using `WHOOP_CLIENT_SECRET`, which never touches the repo or the browser) and forwards the browser to `health.html#whoop_access=...` with the tokens in the URL hash (never sent to a server on that request).
3. `health.html` stores the tokens in `localStorage`, then calls `api/whoop-data.js` (a proxy that forwards your bearer token to WHOOP's v1/v2 REST APIs) to populate Recovery/Sleep/Strain/HRV/RHR/Resp.
4. When the access token expires, `api/whoop-refresh.js` gets a new one automatically.

Setup:

1. Create an app at [developer.whoop.com](https://developer.whoop.com). Set its **Redirect URL** to `https://<your-vercel-domain>/api/whoop-callback`.
2. In your Vercel project: **Settings → Environment Variables** (Production + Preview), add:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET` — never put this in any file in the repo.
   - `WHOOP_REDIRECT_URI` = `https://<your-vercel-domain>/api/whoop-callback` — must exactly match what's registered on developer.whoop.com.
3. In `health.html`'s WHOOP `<script>` block, update the hardcoded `CLIENT_ID` constant to your own (client IDs aren't secret, safe to commit).
4. Redeploy so the env vars take effect.

Data field names in the fetch/render code follow WHOOP API v2 (v1 for `/cycle`, per WHOOP's own migration) as of when this was written — if a stat shows `—`, check the browser console and developer.whoop.com/docs for any field/endpoint renames.

## Building from scratch

[BUILD_DASHBOARD.md](BUILD_DASHBOARD.md) is the prompt I gave Claude to generate `index.html` — paste it into Claude if you want to rebuild that page yourself.
