# The Nirnay API in a container, as run on Render (or Hugging Face Spaces). The web app is
# deployed separately (Vercel) and calls this API. See DEPLOY.md.
FROM python:3.12-slim

# Spaces run the container as user 1000.
RUN useradd --create-home --uid 1000 nirnay
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=nirnay triage/ triage/
COPY --chown=nirnay server/ server/
COPY --chown=nirnay kb/ kb/
COPY --chown=nirnay data/ data/
COPY --chown=nirnay eval/ eval/

USER nirnay
# The inbox database starts fresh from the demo tickets on every restart.
ENV NIRNAY_DB=/tmp/nirnay.db \
    PYTHONUNBUFFERED=1
# Render sets $PORT; Hugging Face Spaces expects 7860.
EXPOSE 7860
CMD ["sh", "-c", "uvicorn server.app:app --host 0.0.0.0 --port ${PORT:-7860} --proxy-headers --forwarded-allow-ips '*'"]
