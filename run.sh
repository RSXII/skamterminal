#!/usr/bin/env bash
# Starts the dev server and opens FCOS in your browser once it's actually
# ready to respond, so you don't get a "can't reach this page" flash.
set -e
cd "$(dirname "$0")"

PORT=3000
URL="http://localhost:$PORT"

npm run dev &
DEV_PID=$!
trap 'kill "$DEV_PID" 2>/dev/null' EXIT

echo "Waiting for the dev server to come up..."
until curl -s -o /dev/null "$URL"; do
  sleep 0.3
done

open "$URL"
wait "$DEV_PID"
