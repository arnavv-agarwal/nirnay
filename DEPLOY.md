# Deploying Nirnay

Two parts: the **API** (Python, `server/`) on **Render**, and the **web app** (`web/`) on **Vercel**.
Both are free and need no card. Deploy the API first, because the web app needs its address.

## 1. API on Render

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, and pick this repository. Render reads `render.yaml`: one free web service, `nirnay-api`, built from the `Dockerfile`, in Singapore.
3. Render asks for two values (they are never stored in the repo):
   - `ANTHROPIC_API_KEY`: the Anthropic key.
   - `NIRNAY_WEB_ORIGINS`: the web app's address. Leave it empty for now and fill it in after step 2 (Environment tab), then the service redeploys.
4. **Apply**. The first build takes a few minutes. The API is then at `https://nirnay-api.onrender.com` (Render adds a suffix if the name is taken).
   Check: `curl https://nirnay-api.onrender.com/api/settings`.

Optional settings (Environment tab): `NIRNAY_DAILY_AI_CALLS` (default 100) and `NIRNAY_PER_MINUTE` (default 10), see `server/limits.py`.

**Keeping it awake.** Render's free plan sleeps after 15 idle minutes, and waking takes about a minute. `.github/workflows/keep-awake.yml` pings `/api/settings` (no AI call) every 10 minutes. Turn it on by adding a repository variable: GitHub → Settings → Secrets and variables → Actions → Variables → `NIRNAY_API_URL` = the API address.

**The inbox resets** to the demo tickets whenever the service restarts (the database lives in `/tmp`), which is what a public demo wants.

## 2. Web app on Vercel

1. On [vercel.com](https://vercel.com): **Add New → Project** → import this GitHub repository.
2. **Root Directory**: `web`. Framework: Next.js (detected).
3. **Environment variable**: `NEXT_PUBLIC_API_URL` = the Render address, e.g. `https://nirnay-api.onrender.com` (no trailing slash).
4. **Deploy.** Then put the Vercel address into Render's `NIRNAY_WEB_ORIGINS` (step 1.3).

## 3. Check it in a private window

- Inbox loads with the demo tickets; Quality shows the evaluation runs; Knowledge base lists 81 articles.
- A new ticket is triaged with the AI in about 10 seconds; "Use Nirnay's draft" fills the reply; send → the next ticket opens, with Undo.
- Phone width: bottom tab bar, list and ticket as separate screens.

## Alternative: Hugging Face Spaces

Since July 2026 Hugging Face runs Docker Spaces only on its paid PRO plan. With PRO: create a Docker Space (`nirnay-api`, Blank, CPU basic), add the secret `ANTHROPIC_API_KEY`, and push with `deploy/push_space.sh <username>/nirnay-api` (a write token is the password). The same Dockerfile listens on port 7860 there.
