#!/bin/bash
# ============================================================
# RUN DATABASE MIGRATIONS
# Applies schema changes to existing database
# ============================================================

set -e  # Exit on error

DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-chequemate_user}"
DB_NAME="${DB_NAME:-chequemate}"
DB_PASSWORD="${DB_PASSWORD:-chequemate_pass}"

MIGRATION_DIR="$(dirname "$0")"

echo "🔄 Running database migrations..."
echo "================================="

# Run all migration files in order
for sql_file in "$MIGRATION_DIR"/[0-9]*.sql; do
    if [ -f "$sql_file" ]; then
        filename=$(basename "$sql_file")
        echo "📄 Running $filename..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$sql_file"
    fi
done

echo "================================="
echo "✅ All migrations completed!"
