#!/usr/bin/env bash
# Local test run: Postgres in Docker, API and frontend on this machine.  Usage: ./dev.sh  (Ctrl+C stops all)
set -e
cd "$(dirname "$0")"
set -a; source .env.dev; set +a

docker compose up -d --wait db
[ -d frontend/node_modules ] || (cd frontend && npm install)

python3 -m sitewatch serve --port 8080 &
API=$!
trap 'kill $API 2>/dev/null' EXIT
cd frontend
BACKEND_URL=http://localhost:8080 npm run dev
