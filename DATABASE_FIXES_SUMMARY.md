# Database Seeding Issues - RESOLVED

## Problem Summary
When trying to run the seed script (`server/database/seeds/seed_all.sh`), you encountered:
1. **Duplicate key errors** - Existing data conflicted with seed data
2. **Schema mismatch errors** - The database was missing columns that were in the schema.sql file
3. **Foreign key constraint violations** - Cascading errors from failed inserts

## Root Causes
1. The database had old data that conflicted with seed data unique constraints
2. The database schema was outdated - missing enhanced fraud detection columns in `transactions` table
3. Seed files had `ON CONFLICT (primary_key)` but conflicts occurred on other unique fields

## Solutions Implemented

### 1. Created Database Reset Script
**File**: `server/database/seeds/reset_db.sql`
- Safely truncates all tables in the correct order
- Resets all sequences to start fresh
- Respects foreign key dependencies

### 2. Created Safe Seeding Script
**File**: `server/database/seeds/seed_with_reset.sh`
- Asks for confirmation before deleting data
- Resets database completely
- Then runs all seeds in order
- **Use this when schema changes or you want fresh data**

### 3. Fixed Seed Conflicts
**Updated**: `server/database/seeds/02_accounts.sql`
- Changed from `ON CONFLICT (account_id) DO NOTHING`
- To `ON CONFLICT (account_number) DO UPDATE SET ...`
- Now handles conflicts on unique account numbers properly

### 4. Created Schema Migration System
**Directory**: `server/database/migrations/`
- Migration runner: `run_migrations.sh`
- First migration: `001_add_transaction_columns.sql`
- Adds missing fraud detection columns to transactions table
- Safe to run multiple times (idempotent)

### 5. Comprehensive Documentation
Created three detailed guides:
- `server/database/SETUP_GUIDE.md` - Complete setup and troubleshooting
- `server/database/seeds/README.md` - Seeding guide
- `server/database/migrations/README.md` - Migration guide

## How to Use

### Quick Fix (What You Need Now)
```bash
# Apply schema changes
cd server/database/migrations
bash run_migrations.sh

# Reset and seed database
cd ../seeds
bash seed_with_reset.sh
# Type 'yes' when prompted
```

### Future Workflow

#### When Schema Changes
```bash
# 1. Update schema.sql with new structure
# 2. Create migration in migrations/ directory
# 3. Run migration
cd server/database/migrations
bash run_migrations.sh

# 4. Seed fresh data
cd ../seeds
bash seed_with_reset.sh
```

#### Normal Development
```bash
# Just seed without reset (preserves existing data)
cd server/database/seeds
bash seed_all.sh
```

#### Production Updates
```bash
# ONLY run migrations, NEVER reset!
cd server/database/migrations
bash run_migrations.sh
```

## Verification

After running the fixes, verify everything is working:

```bash
# Check all tables are seeded
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -c "
SELECT 'banks' as table_name, COUNT(*) FROM banks
UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
ORDER BY table_name;"
```

Expected results:
- 5 banks
- 7 accounts  
- 20 transactions
- All 16 tables populated successfully

## Current Database State
✅ **All issues resolved**
- Schema is up to date with migrations applied
- All 16 tables successfully seeded
- 20 transactions with full fraud detection columns
- No conflicts or errors

## Database Summary
```
table_name           | count
---------------------|-------
account_signatures   |     9
accounts             |     7
banks                |     5
bb_clearings         |    10
blacklist            |    10
cheque_books         |     9
cheque_bounces       |     2
cheque_leaves        |    70
cheques              |    10
customer_profiles    |     7
deep_verifications   |    10
fraud_flags          |     3
initial_validations  |    10
kyc_documents        |    11
settlements          |     7
transactions         |    20  ← Now working!
```

## What Changed in Files

### New Files Created
1. `server/database/seeds/reset_db.sql` - Database reset script
2. `server/database/seeds/seed_with_reset.sh` - Safe seeding with reset
3. `server/database/migrations/001_add_transaction_columns.sql` - Schema migration
4. `server/database/migrations/run_migrations.sh` - Migration runner
5. `server/database/SETUP_GUIDE.md` - Complete setup guide
6. `server/database/seeds/README.md` - Seeding documentation
7. `server/database/migrations/README.md` - Migration documentation

### Modified Files
1. `server/database/seeds/02_accounts.sql` - Fixed conflict handling

## Tips for Future

1. **Always run migrations first** when pulling schema changes
2. **Use `seed_with_reset.sh`** for fresh data (development only!)
3. **Use `seed_all.sh`** for updating existing data
4. **Check `SETUP_GUIDE.md`** for any database issues
5. **Create migrations** for schema changes (don't modify schema.sql directly in production)

## Troubleshooting

### If seeds still fail:
```bash
# Check what's in the database
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate

# List all tables
\dt

# Check a specific table
\d transactions

# Exit
\q
```

### If you need to start completely fresh:
```bash
# Drop and recreate database (DEVELOPMENT ONLY!)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS chequemate;"
sudo -u postgres psql -c "CREATE DATABASE chequemate;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;"

# Apply schema
cd server/database
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -f schema.sql

# Seed data
cd seeds
bash seed_all.sh
```

## Status: ✅ COMPLETE

All database seeding issues are resolved. You can now:
- ✅ Run migrations to update schema
- ✅ Seed data without conflicts
- ✅ Reset database safely when needed
- ✅ Handle future schema changes properly

Your database is ready for development!
