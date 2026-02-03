#!/usr/bin/env bash
set -euo pipefail

VITE_PORT="${VITE_PORT:-5173}"
VITE_HOST="${VITE_HOST:-0.0.0.0}"

echo "Starting Vite dev server on ${VITE_HOST}:${VITE_PORT}..."
npm run dev -- --host "${VITE_HOST}" --port "${VITE_PORT}" &
VITE_PID=$!

# простой ожидатель, пока Vite поднимется
echo "Waiting for Vite dev server..."
for i in {1..60}; do
  if curl -sSf "http://127.0.0.1:${VITE_PORT}/" >/dev/null 2>&1; then
    echo "Vite dev server is up."
    break
  fi
  echo "Vite not ready yet, retry ${i}/60..."
  sleep 1
done

# если так и не поднялся
if ! curl -sSf "http://127.0.0.1:${VITE_PORT}/" >/dev/null 2>&1; then
  echo "Vite dev server did not start in time." >&2
  kill "${VITE_PID}" || true
  exit 1
fi

echo "Generating PDF..."
npm run generate-pdf

echo "Stopping Vite dev server..."
kill "${VITE_PID}" || true
wait "${VITE_PID}" || true

echo "Done."

#npm run dev -- --host 0.0.0.0 </dev/null >/tmp/vite.log 2>&1 &
#npm run generate-pdf
