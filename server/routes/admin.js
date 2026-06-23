import { query } from '../db.js';
import { hashPassword } from '../password.js';
import { requireAuth, requireRole, publicUser } from '../auth.js';

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

// Cadeiras usadas (ativas) e limite do grupo.
async function getSeats(groupId) {
  const { rows } = await query(
    `select g.max_seats,
            count(u.id) filter (where u.active) as used
       from groups g
       left join users u on u.group_id = g.id
      where g.id = $1
      group by g.max_seats`,
    [groupId]
  );
  if (!rows[0]) return null;
  const max = Number(rows[0].max_seats);
  const used = Number(rows[0].used);
  return { max_seats: max, used, available: Math.max(0, max - used) };
}

export default async function adminRoutes(app) {
  const auth = { preHandler: [requireAuth] };
  const superadmin = { preHandler: [requireAuth, requireRole('superadmin')] };
  const adminOrSuper = { preHandler: [requireAuth, requireRole('admin', 'superadmin')] };

  // --- GRUPOS (somente superadmin) ---
  app.get('/api/admin/groups', superadmin, async () => {
    const { rows } = await query(
      `select g.*, count(u.id) filter (where u.active) as used_seats
         from groups g left join users u on u.group_id = g.id
        group by g.id order by g.created_at`
    );
    return { groups: rows };
  });

  app.post('/api/admin/groups', superadmin, async (request, reply) => {
    const { name, max_seats } = request.body || {};
    if (!name) return reply.code(400).send({ error: 'missing_name' });
    const seats = Number.isInteger(max_seats) ? max_seats : Number(max_seats);
    if (!Number.isInteger(seats) || seats < 0) {
      return reply.code(400).send({ error: 'invalid_max_seats' });
    }
    try {
      const { rows } = await query(
        'insert into groups(name, slug, max_seats) values ($1,$2,$3) returning *',
        [name, slugify(name), seats]
      );
      return reply.code(201).send({ group: rows[0] });
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'slug_taken' });
      throw err;
    }
  });

  app.patch('/api/admin/groups/:id', superadmin, async (request, reply) => {
    const { id } = request.params;
    const { name, max_seats, active } = request.body || {};
    const sets = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) { sets.push(`name = $${i++}`); vals.push(name); }
    if (max_seats !== undefined) {
      const s = Number(max_seats);
      if (!Number.isInteger(s) || s < 0) return reply.code(400).send({ error: 'invalid_max_seats' });
      sets.push(`max_seats = $${i++}`); vals.push(s);
    }
    if (active !== undefined) { sets.push(`active = $${i++}`); vals.push(!!active); }
    if (!sets.length) return reply.code(400).send({ error: 'nothing_to_update' });
    vals.push(id);
    const { rows } = await query(
      `update groups set ${sets.join(', ')} where id = $${i} returning *`, vals
    );
    if (!rows[0]) return reply.code(404).send({ error: 'group_not_found' });
    return { group: rows[0] };
  });

  // --- CADEIRAS do grupo do usuario logado (ou ?group_id para superadmin) ---
  app.get('/api/admin/seats', adminOrSuper, async (request, reply) => {
    const me = request.currentUser;
    const groupId = me.role === 'superadmin' && request.query.group_id
      ? request.query.group_id : me.group_id;
    const seats = await getSeats(groupId);
    if (!seats) return reply.code(404).send({ error: 'group_not_found' });
    return { group_id: groupId, ...seats };
  });

  // --- USUARIOS ---
  app.get('/api/admin/users', adminOrSuper, async (request) => {
    const me = request.currentUser;
    const groupId = me.role === 'superadmin' && request.query.group_id
      ? request.query.group_id : me.group_id;
    const { rows } = await query(
      `select id, group_id, email, name, role, active, created_at
         from users where group_id = $1 order by created_at`,
      [groupId]
    );
    return { users: rows };
  });

  app.post('/api/admin/users', adminOrSuper, async (request, reply) => {
    const me = request.currentUser;
    const { email, name, password, role } = request.body || {};
    // Admin de grupo cria no proprio grupo; superadmin pode escolher group_id.
    const groupId = me.role === 'superadmin' && request.body.group_id
      ? request.body.group_id : me.group_id;

    if (!email || !name || !password) {
      return reply.code(400).send({ error: 'missing_fields' });
    }
    // Admin de grupo so cria editor/admin; ninguem cria superadmin pela API.
    const newRole = role === 'admin' ? 'admin' : 'editor';

    const seats = await getSeats(groupId);
    if (!seats) return reply.code(404).send({ error: 'group_not_found' });
    if (seats.available <= 0) {
      return reply.code(409).send({ error: 'no_seats_available', seats });
    }

    let password_hash;
    try {
      password_hash = await hashPassword(password);
    } catch (err) {
      return reply.code(400).send({ error: 'weak_password', message: err.message });
    }

    try {
      const { rows } = await query(
        `insert into users(group_id, email, name, password_hash, role)
         values ($1,$2,$3,$4,$5)
         returning id, group_id, email, name, role, active, created_at`,
        [groupId, String(email).toLowerCase(), name, password_hash, newRole]
      );
      return reply.code(201).send({ user: rows[0] });
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'email_taken' });
      throw err;
    }
  });

  // Atualizar: desativar (libera cadeira), reativar, trocar nome/role/senha.
  app.patch('/api/admin/users/:id', adminOrSuper, async (request, reply) => {
    const me = request.currentUser;
    const { id } = request.params;
    const { name, role, active, password } = request.body || {};

    const { rows: found } = await query('select * from users where id = $1', [id]);
    const target = found[0];
    if (!target) return reply.code(404).send({ error: 'user_not_found' });
    // Admin de grupo so mexe no proprio grupo.
    if (me.role !== 'superadmin' && target.group_id !== me.group_id) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    if (target.role === 'superadmin') {
      return reply.code(403).send({ error: 'cannot_modify_superadmin' });
    }

    // Reativar consome cadeira: validar limite.
    if (active === true && !target.active) {
      const seats = await getSeats(target.group_id);
      if (seats && seats.available <= 0) {
        return reply.code(409).send({ error: 'no_seats_available', seats });
      }
    }

    const sets = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) { sets.push(`name = $${i++}`); vals.push(name); }
    if (role !== undefined) {
      const r = role === 'admin' ? 'admin' : 'editor';
      sets.push(`role = $${i++}`); vals.push(r);
    }
    if (active !== undefined) { sets.push(`active = $${i++}`); vals.push(!!active); }
    if (password !== undefined) {
      try {
        sets.push(`password_hash = $${i++}`);
        vals.push(await hashPassword(password));
      } catch (err) {
        return reply.code(400).send({ error: 'weak_password', message: err.message });
      }
    }
    if (!sets.length) return reply.code(400).send({ error: 'nothing_to_update' });
    vals.push(id);
    const { rows } = await query(
      `update users set ${sets.join(', ')} where id = $${i}
       returning id, group_id, email, name, role, active, created_at`,
      vals
    );
    return { user: rows[0] };
  });
}
