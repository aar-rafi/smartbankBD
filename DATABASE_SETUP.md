# Database Setup Guide for ChequeMate AI

This guide walks you through setting up PostgreSQL and connecting it to the ChequeMate AI application.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 16+ and npm
- Access to database admin credentials

## Step 1: Create PostgreSQL Database and User

Open PostgreSQL command line (or use pgAdmin GUI):

```bash
# Connect to PostgreSQL as admin (default user)
psql -U postgres
```

Then run these SQL commands:

```sql
-- Create a new database
CREATE DATABASE chequemate;

-- Create a dedicated user
CREATE USER chequemate_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;

-- Connect to the new database
\c chequemate

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO chequemate_user;
```

Exit psql by typing `\q`.

## Step 2: Initialize Database Schema

Copy the schema from `database/schema.sql` and apply it to your database:

```bash
# Option 1: Using psql directly
psql -U chequemate_user -d chequemate -h localhost -f database/schema.sql

# Option 2: Copy-paste into pgAdmin query tool
# - In pgAdmin, right-click "Databases" > "Create" > "Database" > name it "chequemate"
# - Go to Tools > Query Tool
# - Paste contents of database/schema.sql
# - Click Execute
```

## Step 3: Add Environment Variables

Create or update `.env.local` in the project root with your database credentials:

```env
# Existing Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# NEW: Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chequemate
DB_USER=chequemate_user
DB_PASSWORD=your_secure_password_here
DB_SSL=false
```

**Important:** Never commit `.env.local` to version control (it's in `.gitignore`).

## Step 4: Install Dependencies

Run from project root:

```bash
npm install
```

This will install the `pg` PostgreSQL driver for Node.js.

## Step 5: Start the Application

```bash
npm run dev
```

The application should start at `http://localhost:3000`.

### First Run - Database Connection Check

When you run the app for the first time, you may see database connection warnings in the browser console if the server-side DB connection hasn't been initialized. This is normal for client-side React apps.

**Note:** The current app is client-side only (React in browser). Database queries currently run in `validationService.ts` which is imported server-side. To fully integrate database queries, you'll need to:

1. **Create a backend server** (Node.js/Express) with endpoints that accept cheque data
2. **Move database queries** from `dbQueries.ts` to backend API routes
3. **Update validation service** to call backend API instead of direct database queries
4. **Handle errors** gracefully when backend is unavailable

See **Backend Integration** section below.

## Step 6: Seed Sample Data (Optional)

To test the validation with real data, add sample accounts and cheques:

```sql
-- As chequemate_user, connect to chequemate database
INSERT INTO accounts (account_number, account_holder_name, branch_code, balance, status)
VALUES 
  ('ACC001234567', 'John Doe', 'BRANCH01', 50000.00, 'active'),
  ('ACC001234568', 'Jane Smith', 'BRANCH02', 75000.00, 'active'),
  ('ACC001234569', 'Acme Corp', 'BRANCH01', 150000.00, 'frozen');

-- Insert cheque books
INSERT INTO cheque_books (account_id, serial_start, serial_end, issued_date, status)
VALUES
  (1, 1000, 1100, '2024-01-15', 'active'),
  (2, 2000, 2100, '2024-02-20', 'active');

-- Insert individual cheque leaves
INSERT INTO cheque_leaves (cheque_book_id, cheque_number, status)
VALUES
  (1, 1001, 'unused'),
  (1, 1002, 'unused'),
  (2, 2001, 'unused');
```

## Troubleshooting

### Connection Refused Error

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
1. Ensure PostgreSQL service is running: `pg_isready -h localhost`
2. Check `.env.local` has correct `DB_HOST` and `DB_PORT`
3. Verify database user and password are correct

### Invalid Database User Error

**Problem:** `error: role "chequemate_user" does not exist`

**Solution:** Re-run Step 1 to create the user with correct password

### Permission Denied Error

**Problem:** `permission denied for schema public`

**Solution:** 
```sql
-- As postgres admin user
GRANT ALL ON SCHEMA public TO chequemate_user;
```

### Database Not Created

**Problem:** `database "chequemate" does not exist`

**Solution:** Re-run the CREATE DATABASE command in Step 1

## Backend Integration (Recommended for Production)

The current setup with direct database connections in `validationService.ts` is not secure for browser-based apps since it would expose database credentials.

**Recommended architecture:**

```
Cheque Image
     ↓
React Frontend (App.tsx)
     ↓ (HTTP POST)
Node.js/Express Backend
     ↓ (SQL)
PostgreSQL Database
     ↓ (JSON response)
React Frontend (display results)
```

### Create a Backend Server

1. Create `server/` directory with Express app:

```javascript
// server/index.js
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  // ... database config from env
});

// Endpoint to validate cheque
app.post('/api/validate-cheque', async (req, res) => {
  const { chequeData } = req.body;
  try {
    // Call validationService with database queries
    const result = await validateChequeData(chequeData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Backend running on :3001'));
```

2. Update `App.tsx` to call this endpoint:

```typescript
const data = await analyzeChequeImage(base64Content, mimeType);
const validation = await fetch('http://localhost:3001/api/validate-cheque', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chequeData: data })
}).then(r => r.json());
```

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg npm package](https://node-postgres.com/)
- [Express.js Guide](https://expressjs.com/)
- [CORS Configuration](https://enable-cors.org/)
