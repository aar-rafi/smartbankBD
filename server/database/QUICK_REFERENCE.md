# Database Quick Reference

## Common Commands

### Seed Database (Fresh Start)
```bash
cd server/database/seeds
bash seed_with_reset.sh
```
⚠️ Deletes all existing data!

### Seed Database (Update Only)
```bash
cd server/database/seeds
bash seed_all.sh
```
✅ Safe - preserves existing data

### Apply Schema Changes
```bash
cd server/database/migrations
bash run_migrations.sh
```

### Check Database Status
```bash
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -c "\dt"
```

### Count All Records
```bash
cd server/database/seeds
bash seed_all.sh | tail -20
```

## File Locations

| Purpose | Path |
|---------|------|
| Schema | `server/database/schema.sql` |
| Migrations | `server/database/migrations/*.sql` |
| Seeds | `server/database/seeds/*.sql` |
| Setup Guide | `server/database/SETUP_GUIDE.md` |
| This File | `server/database/QUICK_REFERENCE.md` |

## Workflow

### Development
```bash
# Daily work - just seed when needed
cd server/database/seeds && bash seed_all.sh
```

### After Schema Changes
```bash
# 1. Run migrations
cd server/database/migrations && bash run_migrations.sh

# 2. Seed fresh data
cd ../seeds && bash seed_with_reset.sh
```

### Production Deploy
```bash
# ONLY run migrations, NEVER reset seeds!
cd server/database/migrations && bash run_migrations.sh
```

## Database Info

| Item | Value |
|------|-------|
| Host | localhost |
| Database | chequemate |
| User | chequemate_user |
| Password | chequemate_pass |
| Tables | 16 |
| Views | 2 |

## Scripts Reference

| Script | Purpose | Safe to Re-run? |
|--------|---------|-----------------|
| `seed_all.sh` | Seed all tables | ✅ Yes |
| `seed_with_reset.sh` | Reset + seed | ⚠️ Deletes data |
| `reset_db.sql` | Truncate all tables | ❌ No - use via script |
| `run_migrations.sh` | Apply schema changes | ✅ Yes |

## Sample Data

After seeding, you'll have:
- 5 banks (including Bangladesh Bank)
- 7 customer accounts
- 10 cheques with full validation pipeline
- 20 transactions with fraud detection data
- Sample fraud cases for testing

## Environment Variables

```bash
export DB_HOST=localhost
export DB_USER=chequemate_user
export DB_NAME=chequemate
export DB_PASSWORD=chequemate_pass
```

## Emergency Reset

If everything breaks:
```bash
# 1. Drop database
sudo -u postgres psql -c "DROP DATABASE chequemate;"

# 2. Recreate
sudo -u postgres psql -c "CREATE DATABASE chequemate;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;"

# 3. Apply schema
cd server/database
PGPASSWORD=chequemate_pass psql -h localhost -U chequemate_user -d chequemate -f schema.sql

# 4. Seed
cd seeds && bash seed_all.sh
```

## Getting Help

1. Check `SETUP_GUIDE.md` for detailed instructions
2. Check `seeds/README.md` for seeding issues  
3. Check `migrations/README.md` for schema updates
4. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/*.log`
