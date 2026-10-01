# Deploying Nirnay

Two parts: the **API** (Python, `server/`) on Hugging Face Spaces, and the **web app** (`web/`) on Vercel.
Both have free tiers. Deploy the API first, because the web app needs its address.

## 1. API on Hugging Face Spaces

1. On huggingface.co: **New Space** → name `nirnay-api` → SDK **Docker** → **Blank** → hardware **CPU basic (free)** → Public.
2. In the Space's **Settings → Variables and secrets**, add:
   - Secret `ANTHROPIC_API_KEY`: the key (never commit it).
   - Variable `NIRNAY_WEB_ORIGINS`: the Vercel address from step 2, e.g. `https://nirnay.vercel.app` (comma-separate several). Add it after step 2, then restart the Space.
   - Optional: `NIRNAY_DAILY_AI_CALLS` (default 100) and `NIRNAY_PER_MINUTE` (default 10), see `server/limits.py`.
3. Create a Hugging Face access token with **write** permission (Settings → Access Tokens).
4. From the project root: `deploy/push_space.sh <hf-username>/nirnay-api`. Use the token as the password.
5. Wait for the build (about 2–3 minutes). The API is at `https://<hf-username>-nirnay-api.hf.space`.
   Check: `curl https://<hf-username>-nirnay-api.hf.space/api/settings`.

Notes:
- The inbox database lives in `/tmp` and starts fresh from the demo tickets on every restart, which is what a public demo wants.
- A free Space sleeps after 48 hours without visits; the first request then takes about 30 seconds.

## 2. Web app on Vercel

1. On vercel.com: **Add New → Project** → import the GitHub repo.
2. **Root Directory**: `web`. Framework: Next.js (detected).
3. **Environment variable**: `NEXT_PUBLIC_API_URL` = `https://<hf-username>-nirnay-api.hf.space` (no trailing slash).
4. Deploy. Then put the Vercel address into the Space's `NIRNAY_WEB_ORIGINS` (step 1.2) and restart the Space.

## 3. Check it in a private window

- Inbox loads with demo tickets; Quality shows the eval runs; Knowledge base lists 81 articles.
- New ticket → triaged with an AI draft → send → next ticket opens.
- Threshold change on Quality moves tickets in the Inbox.
- Phone width: bottom tab bar, list and ticket as separate screens.
