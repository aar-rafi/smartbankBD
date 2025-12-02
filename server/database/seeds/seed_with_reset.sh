#!/bin/bash
# ============================================================
# SEED WITH RESET
# This script resets the database before seeding
# Use this when schema has changed or you want fresh data
# ============================================================

set -e  # Exit on error

DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-chequemate_user}"
DB_NAME="${DB_NAME:-chequemate}"
DB_PASSWORD="${DB_PASSWORD:-chequemate_pass}"

SEED_DIR="$(dirname "$0")"

echo "⚠️  WARNING: This will DELETE ALL existing data!"
echo "================================="
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "🗑️  Resetting database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$SEED_DIR/reset_db.sql" -q

echo ""
echo "🌱 Seeding fresh data..."
bash "$SEED_DIR/seed_all.sh"
