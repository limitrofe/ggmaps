import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './db.js';

// Runner de migracoes simples: aplica os .sql de /migrations em ordem
// e registra os aplicados numa tabela schema_migrations (idempotente).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function run() {
  const pool = getPool();

  await pool.query(`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows } = await pool.query('select filename from schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= ja aplicada: ${file}`);
      continue;
    }
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations(filename) values ($1)', [file]);
      await client.query('commit');
      console.log(`+ aplicada: ${file}`);
    } catch (err) {
      await client.query('rollback');
      console.error(`! falha em ${file}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log('Migracoes concluidas.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
