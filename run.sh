#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ] || [ ! -d node_modules ]; then
  echo 'Install dependencies first: npm ci && python3 -m venv .venv && .venv/bin/pip install -r requirements-lock.txt'
  exit 1
fi
npm run build
exec .venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
