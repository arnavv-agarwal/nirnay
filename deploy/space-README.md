---
title: Nirnay API
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
short_description: Support ticket triage API for PW (prototype)
---

# Nirnay API

The API behind Nirnay, a support-ticket triage prototype built for PW Support (not an official PW product).
The web app calls it; the code and full README are on GitHub.

Try it: `GET /api/settings`, `GET /api/tickets`, or `POST /api/triage` with `{"text": "OTP nahi aa raha"}`.
