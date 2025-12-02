import './loadenv.ts';
import pool from './services/db.ts';
import fs from 'fs/promises';
import path from 'path';

const runSqlFile = async (filePath: string) => {
    try {
        const fullPath = path.join(process.cwd(), filePath);
        console.log(`Reading SQL file: ${fullPath}`);
        const sql = await fs.readFile(fullPath, 'utf-8');

        console.log(`Executing SQL from ${filePath}...`);
        await pool.query(sql);
        console.log(`Successfully executed ${filePath}`);
    } catch (error) {
        console.error(`Error executing ${filePath}:`, error);
        throw error;
    }
};

const initDb = async () => {
    try {
        console.log('Starting database initialization...');

        // Run schema first
        await runSqlFile('server/database/schema.sql');

        // Run data second
        await runSqlFile('server/database/data.sql');

        console.log('Database initialization completed successfully.');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

initDb();
