#!/bin/bash
# ============================================================
# SEED ALL TABLES
# Run this script to populate all tables with sample data
# ============================================================

set -e  # Exit on error

DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-chequemate_user}"
DB_NAME="${DB_NAME:-chequemate}"
DB_PASSWORD="${DB_PASSWORD:-chequemate_pass}"

SEED_DIR="$(dirname "$0")"

echo "🌱 Seeding ChequeMate database..."
echo "================================="

# Run seeds in order
for sql_file in "$SEED_DIR"/[0-9]*.sql; do
    filename=$(basename "$sql_file")
    echo "📄 Running $filename..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$sql_file" -q
done

echo "================================="
echo "✅ All seeds completed successfully!"
echo ""
echo "📊 Summary:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 'banks' as table_name, COUNT(*) as count FROM banks
UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL SELECT 'customer_profiles', COUNT(*) FROM customer_profiles
UNION ALL SELECT 'kyc_documents', COUNT(*) FROM kyc_documents
UNION ALL SELECT 'cheque_books', COUNT(*) FROM cheque_books
UNION ALL SELECT 'cheque_leaves', COUNT(*) FROM cheque_leaves
UNION ALL SELECT 'account_signatures', COUNT(*) FROM account_signatures
UNION ALL SELECT 'blacklist', COUNT(*) FROM blacklist
UNION ALL SELECT 'cheques', COUNT(*) FROM cheques
UNION ALL SELECT 'initial_validations', COUNT(*) FROM initial_validations
UNION ALL SELECT 'bb_clearings', COUNT(*) FROM bb_clearings
UNION ALL SELECT 'deep_verifications', COUNT(*) FROM deep_verifications
UNION ALL SELECT 'fraud_flags', COUNT(*) FROM fraud_flags
UNION ALL SELECT 'settlements', COUNT(*) FROM settlements
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'cheque_bounces', COUNT(*) FROM cheque_bounces
ORDER BY table_name;
"
