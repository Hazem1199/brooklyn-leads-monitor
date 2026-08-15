import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to DB');
    
    // Alter table public.monitors to add sync_status
    await client.query(
      "ALTER TABLE public.monitors ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending' NOT NULL;"
    );
    console.log("Column 'sync_status' added successfully to 'monitors' table.");
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

run();
