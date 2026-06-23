import { query } from './db.js';

// Formato publico do usuario (nunca expor password_hash).
export function publicUser(u) {
  return {
    id: u.id,
    group_id: u.group_id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active
  };
}

// preHandler: exige sessao valida (cookie JWT) e carrega o usuario do banco.
// Recarregar do banco garante que usuario desativado perde acesso na hora.
export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  const sub = request.user?.sub;
  const { rows } = await query(
    'select id, group_id, email, name, role, active from users where id = $1',
    [sub]
  );
  const u = rows[0];
  if (!u || !u.active) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  request.currentUser = u;
}

// preHandler: exige um dos papeis informados. Use sempre apos requireAuth.
export function requireRole(...roles) {
  return async function (request, reply) {
    const u = request.currentUser;
    if (!u || !roles.includes(u.role)) {
      return reply.code(403).send({ error: 'forbidden' });
    }
  };
}
