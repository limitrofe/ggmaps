import { query } from '../db.js';
import { verifyPassword } from '../password.js';
import { requireAuth, publicUser } from '../auth.js';

const isProd = process.env.NODE_ENV === 'production';
const TOKEN_TTL_HOURS = 12;

// Throttle simples em memoria: trava forca-bruta por email+IP.
const attempts = new Map(); // chave -> { count, until }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function throttleKey(req, email) {
  return `${req.ip}|${(email || '').toLowerCase()}`;
}
function isBlocked(key) {
  const a = attempts.get(key);
  return a && a.count >= MAX_ATTEMPTS && Date.now() < a.until;
}
function registerFail(key) {
  const a = attempts.get(key) || { count: 0, until: 0 };
  a.count += 1;
  a.until = Date.now() + WINDOW_MS;
  attempts.set(key, a);
}
function clearFails(key) {
  attempts.delete(key);
}

export default async function authRoutes(app) {
  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body || {};
    const key = throttleKey(request, email);

    if (isBlocked(key)) {
      return reply.code(429).send({ error: 'too_many_attempts' });
    }
    if (!email || !password) {
      return reply.code(400).send({ error: 'missing_credentials' });
    }

    const { rows } = await query(
      'select * from users where email = $1',
      [String(email).toLowerCase()]
    );
    const u = rows[0];
    const ok = u && u.active && (await verifyPassword(password, u.password_hash));
    if (!ok) {
      registerFail(key);
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    clearFails(key);
    const token = app.jwt.sign(
      { sub: u.id, role: u.role, gid: u.group_id },
      { expiresIn: `${TOKEN_TTL_HOURS}h` }
    );
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_TTL_HOURS * 3600
    });
    return { user: publicUser(u) };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (request) => {
    return { user: publicUser(request.currentUser) };
  });
}
