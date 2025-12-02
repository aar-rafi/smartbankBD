# ChequeMate Database Setup Guide

Complete guide for setting up and managing the ChequeMate database.

## Quick Start

### 1. Create Database
```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE chequemate;
CREATE USER chequemate_user WITH PASSWORD 'chequemate_pass';
GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;
\q
```

### 2. Apply Schema
```bash
cd server/database
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -f schema.sql
```

### 3. Run Migrations (if updating existing DB)
```bash
cd server/database/migrations
bash run_migrations.sh
```

### 4. Seed Data
```bash
cd server/database/seeds
bash seed_with_reset.sh
```

## Complete Setup Workflow

### New Installation
```bash
# Step 1: Create database
sudo -u postgres psql -c "CREATE DATABASE chequemate;"
sudo -u postgres psql -c "CREATE USER chequemate_user WITH PASSWORD 'chequemate_pass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;"

# Step 2: Apply schema
cd /path/to/chequemate-ai/server/database
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -f schema.sql

# Step 3: Seed data
cd seeds
bash seed_all.sh
```

### Updating Existing Installation
When schema changes are made:

```bash
# Step 1: Run migrations
cd /path/to/chequemate-ai/server/database/migrations
bash run_migrations.sh

# Step 2: Update seed data (optional - will reset all data!)
cd ../seeds
bash seed_with_reset.sh
```

### Reset Everything (Development Only)
```bash
cd /path/to/chequemate-ai/server/database/seeds
bash seed_with_reset.sh
```

## Environment Configuration

Create a `.env` file or export variables:

```bash
export DB_HOST=localhost
export DB_USER=chequemate_user
export DB_NAME=chequemate
export DB_PASSWORD=chequemate_pass
```

## Database Structure

### Tables (16 total)
1. **banks** - Banking institutions
2. **accounts** - Customer accounts
3. **customer_profiles** - AI behavior data for fraud detection
4. **kyc_documents** - KYC verification documents
5. **cheque_books** - Issued cheque books
6. **cheque_leaves** - Individual cheque leaves
7. **account_signatures** - Reference signatures
8. **blacklist** - Blacklisted entities
9. **cheques** - Main cheque records
10. **initial_validations** - Bank A validation stage
11. **bb_clearings** - Bangladesh Bank clearing
12. **deep_verifications** - Bank B + AI verification
13. **fraud_flags** - Flagged cheques for review
14. **settlements** - Settlement transactions
15. **transactions** - Transaction ledger
16. **cheque_bounces** - Bounced cheque records

### Views
- **v_review_queue** - Supervisor review queue
- **v_today_stats** - Today's cheque statistics

## Common Tasks

### Check Database Status
```bash
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Count Records
```bash
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -c "
SELECT 
    'banks' as table_name, COUNT(*) FROM banks
UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL SELECT 'cheques', COUNT(*) FROM cheques
ORDER BY table_name;"
```

### Backup Database
```bash
pg_dump -h localhost -U chequemate_user -d chequemate > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate < backup_20250101.sql
```

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Permission Denied
```bash
# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;"
sudo -u postgres psql -d chequemate -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chequemate_user;"
sudo -u postgres psql -d chequemate -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chequemate_user;"
```

### Schema Mismatch Errors
If you see errors about missing columns:
```bash
# Run migrations to update schema
cd server/database/migrations
bash run_migrations.sh
```

### Seed Conflicts
If seed_all.sh fails with duplicate key errors:
```bash
# Use reset version
cd server/database/seeds
bash seed_with_reset.sh
```

## Development vs Production

### Development
- Use `seed_with_reset.sh` freely to reset data
- Test migrations on dev database first
- Keep sample data for testing

### Production
- NEVER use `seed_with_reset.sh` (will delete all data!)
- Always backup before migrations
- Use `run_migrations.sh` for schema updates
- Monitor performance and optimize indexes

## File Structure
```
server/database/
├── schema.sql              # Complete database schema
├── SETUP_GUIDE.md         # This file
├── migrations/            # Schema migrations
│   ├── README.md
│   ├── run_migrations.sh
│   └── 001_*.sql
└── seeds/                 # Seed data
    ├── README.md
    ├── seed_all.sh       # Seed without reset
    ├── seed_with_reset.sh # Reset then seed
    ├── reset_db.sql      # Truncate all tables
    └── 01_*.sql - 16_*.sql
```

## Next Steps

After setting up the database:
1. Configure your application's database connection
2. Test the cheque validation pipeline
3. Review the fraud detection features
4. Set up monitoring and backups for production

## Support

For issues:
1. Check this guide first
2. Review error messages carefully
3. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
4. Verify environment variables are set correctly
