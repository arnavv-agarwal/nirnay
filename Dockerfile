# The Nirnay API, as run on Hugging Face Spaces (Docker SDK). The web front end is deployed
# separately (Vercel) and calls this API. See DEPLOY.md.
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
EXPOSE 7860
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers", "--forwarded-allow-ips", "*"]
