import pg from 'pg';

// Pool lazy: so conecta de fato no primeiro query.
// Assim o servidor sobe e serve o front mesmo se o banco ainda nao estiver pronto.
let pool = null;

// Cliente injetavel (testes): qualquer objeto com query(text, params) -> { rows }.
// Em producao fica nulo e usamos o Pool do pg normalmente.
let injectedClient = null;
export function setClient(client) {
  injectedClient = client;
}

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL nao definida no ambiente.');
    }
    pool = new pg.Pool({ connectionString, max: 10 });
  }
  return pool;
}

export function query(text, params) {
  if (injectedClient) return injectedClient.query(text, params);
  return getPool().query(text, params);
}

export async function ping() {
  await query('select 1');
  return true;
}
