#!/bin/sh
set -e

# Construct the DB URL inside the script to hide the password from the process list (ps).
DB_URL="postgres://postgres:${POSTGRES_PASSWORD}@database:5432/thoughts?sslmode=disable"

echo "Running database migrations..."
exec migrate -path /migrations -database "$DB_URL" up
