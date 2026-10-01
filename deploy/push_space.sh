#!/usr/bin/env bash
# Pushes the API to a Hugging Face Space (Docker SDK). Run from the project root:
#   deploy/push_space.sh <hf-username>/<space-name>
# Git asks for your Hugging Face username and an access token (write) as the password.
# DRY_RUN=1 builds the folder and prints what would be pushed, without pushing.
set -euo pipefail
SPACE="${1:?usage: deploy/push_space.sh <hf-username>/<space-name>}"

BUILD="$(mktemp -d)"
cp -R Dockerfile .dockerignore requirements.txt triage server kb data eval "$BUILD"/
cp deploy/space-README.md "$BUILD"/README.md
rm -f "$BUILD"/data/nirnay.db
find "$BUILD" -name __pycache__ -type d -prune -exec rm -rf {} +

cd "$BUILD"
if [ "${DRY_RUN:-}" = "1" ]; then find . -type f | sort; exit 0; fi
git init -q -b main
git add .
git commit -qm "Deploy Nirnay API"
git push --force "https://huggingface.co/spaces/$SPACE" main
echo "Pushed. Build logs: https://huggingface.co/spaces/$SPACE"
