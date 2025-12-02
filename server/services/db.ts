import pg from 'pg';

const { Pool } = pg;

// Validate required DB environment variables early to provide clear errors
const missingVars: string[] = [];
if (!process.env.DB_USER) missingVars.push('DB_USER');
if (!process.env.DB_PASSWORD) missingVars.push('DB_PASSWORD');
if (!process.env.DB_NAME) missingVars.push('DB_NAME');

if (missingVars.length > 0) {
  console.error(`Missing required DB environment variables: ${missingVars.join(', ')}`);
  console.error('Please create a `.env.local` in the project root or set these environment variables.');
  console.error('Example `.env.local` entries:');
  console.error('DB_HOST=localhost');
  console.error('DB_PORT=5432');
  console.error('DB_NAME=chequemate');
  console.error('DB_USER=chequemate_user');
  console.error('DB_PASSWORD=your_secure_password');
  // Exit early - pool creation will fail with an ambiguous error otherwise
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST ,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Health check function
export const testConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', res.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Close pool gracefully
export const closePool = async (): Promise<void> => {
  await pool.end();
};

export default pool;
