import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { Pool } from 'pg';

dotenv.config();

const sqlPath = new URL('../sql/schema.sql', import.meta.url);
const sql = await readFile(sqlPath, 'utf8');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  console.log('Running migrations from', sqlPath.pathname);
  await pool.query(sql);
  console.log('Migrations applied successfully');
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
