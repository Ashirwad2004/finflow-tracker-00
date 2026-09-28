#!/usr/bin/env bash
set -e

PORT=${PORT:-8000}
echo "Starting FinFlow API on 0.0.0.0:${PORT}..."
exec uvicorn src.main:app --host 0.0.0.0 --port "$PORT"
