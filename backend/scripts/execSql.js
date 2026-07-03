// Runs a raw SQL file directly against the Supabase Postgres database.
// Connection string must be provided via the SUPABASE_DB_URL env var at
// invocation time (never stored in a committed file) — this project has no
// PostgREST-based way to run DDL, so this is the escape hatch for schema
// migrations that must be applied programmatically instead of via the
// Supabase SQL editor.
//
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/execSql.js path/to/file.sql
const fs = require('fs');
const { Client } = require('pg');

async function run() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error('Usage: node scripts/execSql.js <path-to-sql-file>');
    process.exit(1);
  }
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error('SUPABASE_DB_URL env var is required.');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  await client.connect();
  try {
    await client.query(sql);
    console.log(`OK — executed ${sqlPath}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('SQL execution failed:', err.message);
  process.exit(1);
});
