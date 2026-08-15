import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load .env file
dotenv.config()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set in the environment or .env file!')
  process.exit(1)
}

async function runMigrations() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase connections
    },
  })

  try {
    console.log('[Migration] Connecting to Supabase database...')
    await client.connect()
    console.log('[Migration] Connected successfully!')

    const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql')
    console.log(`[Migration] Reading SQL schema from: ${schemaPath}`)
    const sql = fs.readFileSync(schemaPath, 'utf8')

    console.log('[Migration] Executing migration queries on remote Supabase...')
    await client.query(sql)
    console.log('[Migration] Migrations applied successfully! All tables, triggers, and publications are set up.')
  }
  catch (error) {
    console.error('[Migration] Database migration failed:', error)
    process.exit(1)
  }
  finally {
    await client.end()
    console.log('[Migration] Connection closed.')
  }
}

runMigrations()
