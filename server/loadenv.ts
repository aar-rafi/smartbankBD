import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

// If you want to verify:
console.log("Loaded env:", Object.keys(process.env));
