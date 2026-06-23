import 'dotenv/config';
import { getPool } from './db.js';
import { hashPassword } from './password.js';

// Bootstrap do primeiro superadmin. Como contas so sao criadas por admin,
// este script cria o grupo de sistema e o superadmin inicial.
//
// Uso:
//   SEED_EMAIL=admin@jota.info SEED_PASSWORD='senhaForte123' SEED_NAME='Admin' npm run seed:admin
// ou:
//   node server/seed-admin.js --email admin@jota.info --password 'senhaForte123' --name 'Admin'

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const email = (arg('--email') || process.env.SEED_EMAIL || '').toLowerCase();
const password = arg('--password') || process.env.SEED_PASSWORD || '';
const name = arg('--name') || process.env.SEED_NAME || 'Super Admin';

async function run() {
  if (!email || !password) {
    console.error('Informe email e senha (SEED_EMAIL/SEED_PASSWORD ou --email/--password).');
    process.exit(1);
  }
  const pool = getPool();

  // Grupo de sistema (abriga superadmins). max_seats alto so por convencao.
  const { rows: groupRows } = await pool.query(
    `insert into groups(name, slug, max_seats)
     values ('Sistema (JOTA)', 'system', 999)
     on conflict (slug) do update set name = excluded.name
     returning id`
  );
  const groupId = groupRows[0].id;

  const password_hash = await hashPassword(password);

  const { rows } = await pool.query(
    `insert into users(group_id, email, name, password_hash, role, active)
     values ($1,$2,$3,$4,'superadmin', true)
     on conflict (email) do update
       set name = excluded.name,
           password_hash = excluded.password_hash,
           role = 'superadmin',
           active = true
     returning id, email, role`,
    [groupId, email, name, password_hash]
  );

  console.log('Superadmin pronto:', rows[0]);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
