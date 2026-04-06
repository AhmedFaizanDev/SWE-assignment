#!/bin/sh
set -eu

# Run schema migrations during deployment by default.
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  python manage.py migrate --noinput
fi

# Build/refresh semantic RAG index during deploy (optional but recommended).
if [ "${RUN_RAG_REINDEX:-1}" = "1" ]; then
  python manage.py reindex_rag || true
fi

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout "${GUNICORN_TIMEOUT:-120}"
