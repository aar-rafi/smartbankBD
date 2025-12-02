# Database Seeding Guide

## Overview
This directory contains seed data for the ChequeMate fraud detection system. The seeds populate 16 tables with sample data for testing and development.

## Quick Start

### Fresh Install (Recommended)
Use this when setting up for the first time or when schema has changed:

```bash
cd server/database/seeds
bash seed_with_reset.sh
```

This will:
1. Ask for confirmation (to prevent accidental data loss)
2. Truncate all tables and reset sequences
3. Seed all tables in the correct order

### Update Existing Data
Use this to add/update data without clearing existing records:

```bash
cd server/database/seeds
bash seed_all.sh
```

Note: This may fail if there are conflicting unique constraints.

## Environment Variables
Configure database connection (defaults shown):

```bash
export DB_HOST=localhost
export DB_USER=chequemate_user
export DB_NAME=chequemate
export DB_PASSWORD=chequemate_pass
```

## Seed Files Order
Seeds run in numbered order to respect foreign key dependencies:

1. `01_banks.sql` - Bank institutions (5 banks including BB)
2. `02_accounts.sql` - Customer accounts (8 accounts across banks)
3. `03_customer_profiles.sql` - AI behavior data for fraud detection
4. `04_kyc_documents.sql` - KYC documents and verification data
5. `05_cheque_books.sql` - Cheque books issued to accounts
6. `06_cheque_leaves.sql` - Individual cheque leaves
7. `07_account_signatures.sql` - Reference signatures for verification
8. `08_blacklist.sql` - Blacklisted accounts/cheques/persons
9. `09_cheques.sql` - Main cheque records
10. `10_initial_validations.sql` - Bank A validations
11. `11_bb_clearings.sql` - Bangladesh Bank clearing records
12. `12_deep_verifications.sql` - Bank B + AI verifications
13. `13_fraud_flags.sql` - Flagged cheques for review
14. `14_settlements.sql` - Settlement transactions
15. `15_transactions.sql` - Transaction ledger
16. `16_cheque_bounces.sql` - Bounced cheque records

## Manual Operations

### Reset Only (Clear all data)
```bash
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f reset_db.sql
```

### Run Specific Seed File
```bash
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f 02_accounts.sql
```

## Troubleshooting

### Duplicate Key Errors
If you see errors like "duplicate key value violates unique constraint":
- Use `seed_with_reset.sh` to clear existing data first
- Or manually delete conflicting records before seeding

### Foreign Key Errors
If you see errors like "violates foreign key constraint":
- Ensure you're running seeds in order (use seed_all.sh)
- Check that parent records exist (e.g., banks before accounts)
- Use `seed_with_reset.sh` for a clean slate

### Connection Errors
If you can't connect to the database:
- Verify database credentials in environment variables
- Check that PostgreSQL is running
- Ensure database `chequemate` exists

## Schema Changes
When the schema changes:
1. Update `schema.sql` with the new structure
2. Create a migration file in `server/database/migrations/` (numbered like `001_description.sql`)
3. Run migrations: `bash server/database/migrations/run_migrations.sh`
4. Update seed files if new columns/tables require data
5. Use `seed_with_reset.sh` to populate with fresh data

### Example: Adding New Columns
```bash
# 1. Create migration file
nano server/database/migrations/002_add_new_column.sql

# 2. Run migration
bash server/database/migrations/run_migrations.sh

# 3. Seed fresh data
cd server/database/seeds
bash seed_with_reset.sh
```

## Data Summary
After successful seeding, you'll see a count of records in each table:
- 5 banks (including Bangladesh Bank)
- 8 customer accounts
- Sample transactions, cheques, validations
- Test data for fraud scenarios (blacklist, bounces, etc.)
