#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Codex-Project
npm ci --cache .npm-cache --no-audit --no-fund
if [ ! -x .venv/bin/python ]; then python3 -m venv .venv; fi
.venv/bin/python -m pip install -r requirements-lock.txt
npm run build
.venv/bin/python -m pytest -q
npm test
