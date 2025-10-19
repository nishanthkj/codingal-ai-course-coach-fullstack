#!/usr/bin/env bash
set -e

host="db"
port=5432

until python - <<PY
import socket, sys
s=socket.socket()
try:
  s.connect(("${host}", ${port}))
  s.close()
except Exception:
  sys.exit(1)
PY
do
  echo "Waiting for postgres..."
  sleep 1
done

python manage.py makemigrations
python manage.py migrate
python manage.py migrate --noinput
python manage.py seed_demo || true
python manage.py collectstatic --noinput || true

exec "$@"
