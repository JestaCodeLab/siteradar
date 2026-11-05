#!/usr/bin/env bash
# Local test run: Postgres (Docker if you have it, otherwise Homebrew), API and frontend on this machine.
# Usage: ./dev.sh   (Ctrl+C stops the API and frontend)
set -e
cd "$(dirname "$0")"
set -a; source .env.dev; set +a

if command -v docker >/dev/null 2>&1; then
  docker compose up -d --wait db
else
  echo "Docker not found, using Postgres from Homebrew."
  if ! command -v psql >/dev/null 2>&1; then
    echo "Install it first:  brew install postgresql@16 && brew services start postgresql@16"
    echo "(or install Docker Desktop from https://www.docker.com/products/docker-desktop and run this again)"
    exit 1
  fi
  pg_isready -q -h localhost -p 5432 || { echo "Postgres is not running. Start it:  brew services start postgresql@16"; exit 1; }
  # create the same user and database the Docker setup uses (safe to run repeatedly)
  psql -q -h localhost -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='sitewatch'" | grep -q 1 \
    || psql -q -h localhost -d postgres -c "CREATE ROLE sitewatch LOGIN SUPERUSER PASSWORD 'sitewatch'"
  psql -q -h localhost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='sitewatch'" | grep -q 1 \
    || psql -q -h localhost -d postgres -c "CREATE DATABASE sitewatch OWNER sitewatch"
fi

[ -d frontend/node_modules ] || (cd frontend && npm install)

python3 -m sitewatch serve --port 8080 &
API=$!
trap 'kill $API 2>/dev/null' EXIT
cd frontend
BACKEND_URL=http://localhost:8080 npm run dev
