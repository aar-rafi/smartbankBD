# Database Migrations

## Overview
This directory contains SQL migration scripts to update the database schema for existing installations.

## When to Use Migrations
Use migrations when:
- Adding new columns to existing tables
- Modifying column types or constraints
- Adding new indexes
- Any schema change that needs to preserve existing data

## Creating a Migration

### Naming Convention
Migrations are numbered sequentially:
```
001_add_transaction_columns.sql
002_add_user_roles.sql
003_update_indexes.sql
```

### Migration Template
```sql
-- ============================================================
-- MIGRATION: [Brief description]
-- [Detailed explanation of what this migration does]
-- ============================================================

-- Use DO blocks for conditional changes
DO $$ 
BEGIN
    -- Check if column exists before adding
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='your_table' AND column_name='new_column') THEN
        ALTER TABLE your_table ADD COLUMN new_column VARCHAR(100);
    END IF;
END $$;

\echo 'Migration complete: [description]'
```

## Running Migrations

### Run All Migrations
```bash
cd server/database/migrations
bash run_migrations.sh
```

### Run Specific Migration
```bash
PGPASSWORD=$DB_PASSWORD psql -h localhost -U chequemate_user -d chequemate -f 001_add_transaction_columns.sql
```

## Best Practices

1. **Always use conditional checks** - Migrations should be idempotent (safe to run multiple times)
2. **Test before applying** - Test migrations on a development database first
3. **Document changes** - Add clear comments explaining why the change is needed
4. **Preserve data** - Never drop columns or tables without careful consideration
5. **Update schema.sql** - Keep schema.sql in sync with all migrations

## Example Migrations

### Adding a Column
```sql
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='accounts' AND column_name='email') THEN
        ALTER TABLE accounts ADD COLUMN email VARCHAR(255);
    END IF;
END $$;
```

### Adding an Index
```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_accounts_email') THEN
        CREATE INDEX idx_accounts_email ON accounts(email);
    END IF;
END $$;
```

### Modifying a Column Type
```sql
DO $$
BEGIN
    -- Check current data type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='accounts' AND column_name='phone' 
               AND data_type='character varying' AND character_maximum_length=20) THEN
        ALTER TABLE accounts ALTER COLUMN phone TYPE VARCHAR(30);
    END IF;
END $$;
```

## Existing Migrations

### 001_add_transaction_columns.sql
- **Purpose**: Add enhanced fraud detection columns to transactions table
- **Added Columns**:
  - `receiver_name` - Name of transaction receiver
  - `receiver_account` - Receiver's account number
  - `receiver_label` - Classification (unique/regular/too_freq)
  - `txn_date` - Transaction date
  - `txn_time` - Transaction time
  - `branch_code` - Branch identifier
  - `branch_name` - Branch name
  - `txn_number` - Transaction sequence number
- **Added Indexes**: 
  - `idx_transactions_receiver` - On receiver_name
  - `idx_transactions_date` - On txn_date

## Troubleshooting

### Migration Fails with "column already exists"
This is fine if you're using conditional checks (DO blocks). The migration is idempotent.

### Migration Fails with Permission Error
Ensure the database user has ALTER TABLE privileges:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chequemate_user;
```

### How to Rollback a Migration
Migrations should include rollback scripts if needed:
```sql
-- To rollback: DROP COLUMN receiver_name
-- Run: ALTER TABLE transactions DROP COLUMN IF EXISTS receiver_name;
```

## Environment Variables
Same as seeding:
```bash
export DB_HOST=localhost
export DB_USER=chequemate_user
export DB_NAME=chequemate
export DB_PASSWORD=chequemate_pass
```
