#!/bin/sh
set -e

cat <<EOF > /pgadmin4/servers.json
{
  "Servers": {
    "1": {
      "Name": "Postgres Network DB",
      "Group": "Docker Network",
      "Host": "db",
      "Port": 5432,
      "MaintenanceDB": "${POSTGRES_DB}",
      "Username": "${POSTGRES_USER}",
      "Password": "${POSTGRES_PASSWORD}",
      "SSLMode": "prefer"
    }
  }
}
EOF

exec /entrypoint.sh
