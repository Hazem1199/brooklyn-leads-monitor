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
    
    // Check if profiles table has rows
    const res = await client.query('SELECT * FROM public.profiles LIMIT 5');
    console.log('Profiles:', res.rows);
    
    // Try update with a dummy ID to see if it throws
    const upd = await client.query(
      'UPDATE public.profiles SET telegram_chat_id = $1 WHERE id = $2',
      ['123456', '00000000-0000-0000-0000-000000000000']
    );
    console.log('Update result rowCount:', upd.rowCount);
  } catch (err) {
    console.error('Error running test:', err);
  } finally {
    await client.end();
  }
}

run();
