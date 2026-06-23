import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './auth.js';
import { ping } from './db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import piecesRoutes from './routes/pieces.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Monta o Fastify configurado (sem dar listen). Reutilizado pelo servidor
// e pelos testes (via app.inject), por isso fica separado do index.js.
export async function buildApp({ logger = true } = {}) {
  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET ausente ou curto (>=32 chars). Gere com: openssl rand -hex 32');
  }

  // bodyLimit maior: o salvar envia o state + thumbnail (base64).
  const app = Fastify({ logger, bodyLimit: 8 * 1024 * 1024 });

  // Aceita corpo JSON vazio (ex.: POST /duplicate, /logout) sem dar 400.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    if (!body || !body.trim()) return done(null, {});
    try {
      done(null, JSON.parse(body));
    } catch (err) {
      err.statusCode = 400;
      done(err);
    }
  });

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: SESSION_SECRET,
    cookie: { cookieName: 'token', signed: false }
  });

  app.get('/api/health', async () => ({ ok: true }));
  app.get('/api/health/db', async (request, reply) => {
    try {
      await ping();
      return { ok: true, db: 'up' };
    } catch (err) {
      reply.code(503);
      return { ok: false, db: 'down', error: err.message };
    }
  });

  await app.register(authRoutes);
  await app.register(adminRoutes);
  await app.register(piecesRoutes);

  app.get('/api/mapbox-token', { preHandler: requireAuth }, async (request, reply) => {
    const token = process.env.MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN || '';
    reply.header('Cache-Control', 'private, no-store');
    return { token };
  });

  await app.register(fastifyStatic, { root: DIST_DIR, prefix: '/' });

  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'not_found' });
      return;
    }
    reply.sendFile('index.html');
  });

  return app;
}
