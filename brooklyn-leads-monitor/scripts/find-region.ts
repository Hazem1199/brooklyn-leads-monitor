import { Client } from 'pg'

const regions = [
  'eu-central-1', // Frankfurt
  'eu-west-1',    // Ireland
  'eu-west-2',    // London
  'eu-west-3',    // Paris
  'us-east-1',    // N. Virginia
  'us-east-2',    // Ohio
  'us-west-1',    // N. California
  'us-west-2',    // Oregon
  'ap-southeast-1', // Singapore
  'ap-southeast-2'  // Sydney
]

const username = 'postgres.vicwjuojualdoexbhqez'
const password = 'FeIvK5OAzQuY5j6P'
const database = 'postgres'

async function testRegion(region: string) {
  const host = `aws-0-${region}.pooler.supabase.com`
  console.log(`Testing ${region}...`)
  const client = new Client({
    host: host,
    port: 6543, // Transaction pooler
    user: username,
    password: password,
    database: database,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  })

  try {
    await client.connect()
    console.log(`🎉 SUCCESS: Connected to region ${region}!`)
    await client.end()
    return true
  } catch (err: any) {
    console.log(`❌ Failed for ${region}:`, err.message)
    return false
  }
}

async function scan() {
  for (const r of regions) {
    const ok = await testRegion(r)
    if (ok) {
      console.log(`\nYour database region is: ${r}`)
      console.log(`Use this DATABASE_URL:`)
      console.log(`postgresql://postgres.vicwjuojualdoexbhqez:${password}@aws-0-${r}.pooler.supabase.com:6543/postgres`)
      break
    }
  }
}

scan()
