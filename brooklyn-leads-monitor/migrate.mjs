// migrate.mjs — Try multiple Supabase connection endpoints
import pg from 'pg'
const { Client } = pg

const DB_PASSWORD = 'FeIvK5OAzQuY5j6P'
const PROJECT_REF  = 'vicwjuojualdoexbhqez'

// Supabase has multiple connection endpoints to try
const ENDPOINTS = [
  // Transaction pooler (port 6543)
  { host: `aws-0-eu-central-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_REF}` },
  // Session pooler (port 5432)
  { host: `aws-0-eu-central-1.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_REF}` },
  // Direct (port 5432)
  { host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: 'postgres' },
  // IPv4 pooler alternative regions
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_REF}` },
]

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TABLE IF EXISTS leads;
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name      TEXT NOT NULL DEFAULT 'Unknown Group',
  post_url        TEXT,
  post_content    TEXT NOT NULL,
  summary         TEXT,
  is_lead         BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_score NUMERIC(4, 3) DEFAULT 0,
  sender          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read" ON leads FOR SELECT USING (TRUE);
CREATE POLICY "Allow service insert" ON leads FOR INSERT WITH CHECK (TRUE);
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE leads;
EXCEPTION WHEN others THEN NULL;
END $$;
CREATE INDEX idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX idx_leads_is_lead ON leads (is_lead);
INSERT INTO leads (group_name, post_url, post_content, summary, is_lead, confidence_score, sender)
VALUES
  ('مجموعة المحترفين المصريين','https://facebook.com/groups/test/1','حد يرشحلي مكان اخد فيه MBA قوي في القاهرة بسرعة؟','Student inquiring about MBA programs in Cairo',TRUE,0.95,'test@example.com'),
  ('Egyptian MBA Community','https://facebook.com/groups/test/2','عايز اكمل تعليمي وآخد درجة الماجستير في إدارة الأعمال','Prospective student interested in MBA degree',TRUE,0.88,'test2@example.com'),
  ('Business Cairo Network',NULL,'شكرا على حفلة النجاح كانت تجربة رائعة','General social post, not a lead',FALSE,0.05,'test3@example.com');
`

async function tryConnect(endpoint) {
  const client = new Client({
    host: endpoint.host,
    port: endpoint.port,
    database: 'postgres',
    user: endpoint.user,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
  })
  await client.connect()
  return client
}

console.log('🔌 Trying Supabase connection endpoints...\n')

let connected = false
for (const ep of ENDPOINTS) {
  console.log(`   Trying ${ep.host}:${ep.port} (user: ${ep.user})`)
  try {
    const client = await tryConnect(ep)
    console.log('   ✅ Connected!\n')
    connected = true

    console.log('🚀 Running schema migration...')
    await client.query(SCHEMA_SQL)
    console.log('✅ Schema created!\n')

    const result = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' ORDER BY ordinal_position`)
    console.log('📋 Table "leads" columns:')
    result.rows.forEach(r => console.log(`   ✓ ${r.column_name.padEnd(20)} ${r.data_type}`))

    const count = await client.query('SELECT COUNT(*) FROM leads')
    console.log(`\n✅ Rows inserted: ${count.rows[0].count}`)
    console.log('\n🎉 Migration complete! Database is ready.')
    await client.end()
    break
  }
  catch (err) {
    console.log(`   ✗ Failed: ${err.message}\n`)
  }
}

if (!connected) {
  console.error('\n❌ All connection attempts failed.')
  console.error('💡 The Supabase project may require IPv6 or have firewall restrictions.')
  console.error('   Please run the SQL manually in: https://supabase.com/dashboard/project/vicwjuojualdoexbhqez/sql')
}
