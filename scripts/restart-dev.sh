#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
BACKEND_LOG="$LOG_DIR/dev-backend.log"
FRONTEND_LOG="$LOG_DIR/dev-frontend.log"

mkdir -p "$LOG_DIR"

echo "Stopping existing dev servers..."
pkill -f "uvicorn backend.main:app" >/dev/null 2>&1 || true
pkill -f "npm run dev" >/dev/null 2>&1 || true
pkill -f "node .*vite" >/dev/null 2>&1 || true

echo "Starting backend..."
nohup python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 \
  > "$BACKEND_LOG" 2>&1 &

echo "Starting frontend..."
nohup npm run dev -- --host 127.0.0.1 > "$FRONTEND_LOG" 2>&1 &

echo "Waiting for backend health..."
for _ in {1..20}; do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health | grep -q "200"; then
    echo "Backend up."
    break
  fi
  sleep 0.5
done

echo "Waiting for frontend..."
for _ in {1..20}; do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173 | grep -q "200"; then
    echo "Frontend up."
    break
  fi
  sleep 0.5
done

echo "Done. Logs:"
echo "  Backend: $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
