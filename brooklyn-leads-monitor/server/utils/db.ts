import { Client } from 'pg'

export async function queryDb<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured on the server')
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  await client.connect()
  try {
    const res = await client.query(sql, params)
    return res.rows as T[]
  }
  finally {
    await client.end()
  }
}
