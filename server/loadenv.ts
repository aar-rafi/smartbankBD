import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

// Strip carriage returns (\r) from all environment variables (Windows line ending issue)
Object.keys(process.env).forEach((key) => {
  if (typeof process.env[key] === 'string') {
    process.env[key] = process.env[key]!.replace(/\r/g, '');
  }
});

// Debug: Show loaded environment variables
const relevantEnvVars = {
  SERVER_PORT: process.env.SERVER_PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_SSL: process.env.DB_SSL,
};
console.log("Loaded environment variables:", relevantEnvVars);
