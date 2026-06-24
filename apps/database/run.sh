#!/bin/sh
set -eu

# Construct the DB URL inside the script to hide the password from the process list (ps).
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
DB_URL="postgres://postgres:${POSTGRES_PASSWORD}@database:5432/cogito?sslmode=disable"

echo "Running database migrations..."
exec migrate -path /migrations -database "$DB_URL" up
