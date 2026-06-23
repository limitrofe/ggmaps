import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { saveThumbnail, readThumbnail, deleteThumbnail, thumbnailMime } from '../storage.js';

const thumbUrl = (p) => (p.thumbnail_path ? `/api/pieces/${p.id}/thumbnail` : null);

// Peças: galeria isolada por grupo. Todos do grupo veem, editam e duplicam.
export default async function piecesRoutes(app) {
  const auth = { preHandler: [requireAuth] };

  // Galeria do grupo (sem o state_json, que pode ser grande).
  app.get('/api/pieces', auth, async (request) => {
    const gid = request.currentUser.group_id;
    const { rows } = await query(
      `select id, title, author_id, author_name, thumbnail_path, forked_from_id, created_at, updated_at
         from pieces where group_id = $1 order by updated_at desc`,
      [gid]
    );
    return { pieces: rows.map((r) => ({ ...r, thumbnail_url: thumbUrl(r) })) };
  });

  // Uma peça com o estado completo (para abrir/editar).
  app.get('/api/pieces/:id', auth, async (request, reply) => {
    const { rows } = await query(
      'select * from pieces where id = $1 and group_id = $2',
      [request.params.id, request.currentUser.group_id]
    );
    const p = rows[0];
    if (!p) return reply.code(404).send({ error: 'not_found' });
    return {
      piece: {
        id: p.id, title: p.title, state: p.state_json,
        author_id: p.author_id, author_name: p.author_name,
        forked_from_id: p.forked_from_id,
        created_at: p.created_at, updated_at: p.updated_at,
        thumbnail_url: thumbUrl(p)
      }
    };
  });

  app.get('/api/pieces/:id/thumbnail', auth, async (request, reply) => {
    const { rows } = await query(
      'select id, thumbnail_path from pieces where id = $1 and group_id = $2',
      [request.params.id, request.currentUser.group_id]
    );
    const p = rows[0];
    if (!p || !p.thumbnail_path) return reply.code(404).send({ error: 'not_found' });
    try {
      const buf = await readThumbnail(p.thumbnail_path);
      reply.header('Content-Type', thumbnailMime(p.thumbnail_path));
      reply.header('Cache-Control', 'private, max-age=60');
      return reply.send(buf);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  // Criar nova peça.
  app.post('/api/pieces', auth, async (request, reply) => {
    const u = request.currentUser;
    const { title, state, thumbnail } = request.body || {};
    if (!state || typeof state !== 'object') {
      return reply.code(400).send({ error: 'missing_state' });
    }
    const { rows } = await query(
      `insert into pieces(group_id, author_id, author_name, title, state_json)
       values ($1,$2,$3,$4,$5) returning id`,
      [u.group_id, u.id, u.name, String(title || 'Sem titulo').slice(0, 200), state]
    );
    const id = rows[0].id;
    const file = await saveThumbnail(id, thumbnail);
    if (file) await query('update pieces set thumbnail_path = $1 where id = $2', [file, id]);
    return reply.code(201).send({ id });
  });

  // Atualizar (qualquer usuario do grupo pode editar — colaborativo).
  app.put('/api/pieces/:id', auth, async (request, reply) => {
    const u = request.currentUser;
    const { rows: found } = await query(
      'select id, group_id, thumbnail_path from pieces where id = $1',
      [request.params.id]
    );
    const p = found[0];
    if (!p || p.group_id !== u.group_id) return reply.code(404).send({ error: 'not_found' });

    const { title, state, thumbnail } = request.body || {};
    const sets = [];
    const vals = [];
    let i = 1;
    if (title !== undefined) { sets.push(`title = $${i++}`); vals.push(String(title).slice(0, 200)); }
    if (state !== undefined) { sets.push(`state_json = $${i++}`); vals.push(state); }
    if (thumbnail) {
      const file = await saveThumbnail(p.id, thumbnail);
      if (file) { sets.push(`thumbnail_path = $${i++}`); vals.push(file); }
    }
    sets.push('updated_at = now()');
    vals.push(p.id);
    await query(`update pieces set ${sets.join(', ')} where id = $${i}`, vals);
    return { ok: true };
  });

  // Duplicar: copia estado + thumbnail numa nova peça do mesmo grupo.
  app.post('/api/pieces/:id/duplicate', auth, async (request, reply) => {
    const u = request.currentUser;
    const { rows } = await query(
      'select * from pieces where id = $1 and group_id = $2',
      [request.params.id, u.group_id]
    );
    const src = rows[0];
    if (!src) return reply.code(404).send({ error: 'not_found' });

    const requested = (request.body && request.body.title) ? String(request.body.title).trim() : '';
    const newTitle = (requested || `${src.title} (copia)`).slice(0, 200);

    const { rows: ins } = await query(
      `insert into pieces(group_id, author_id, author_name, title, state_json, forked_from_id)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [u.group_id, u.id, u.name, newTitle, src.state_json, src.id]
    );
    const id = ins[0].id;
    if (src.thumbnail_path) {
      try {
        const buf = await readThumbnail(src.thumbnail_path);
        const dataUrl = `data:${thumbnailMime(src.thumbnail_path)};base64,${buf.toString('base64')}`;
        const file = await saveThumbnail(id, dataUrl);
        if (file) await query('update pieces set thumbnail_path = $1 where id = $2', [file, id]);
      } catch { /* sem thumb, segue */ }
    }
    return reply.code(201).send({ id });
  });

  // Excluir: autor ou admin/superadmin do grupo.
  app.delete('/api/pieces/:id', auth, async (request, reply) => {
    const u = request.currentUser;
    const { rows } = await query(
      'select id, group_id, author_id, thumbnail_path from pieces where id = $1',
      [request.params.id]
    );
    const p = rows[0];
    if (!p || p.group_id !== u.group_id) return reply.code(404).send({ error: 'not_found' });
    const canDelete = p.author_id === u.id || u.role === 'admin' || u.role === 'superadmin';
    if (!canDelete) return reply.code(403).send({ error: 'forbidden' });
    await query('delete from pieces where id = $1', [p.id]);
    await deleteThumbnail(p.thumbnail_path);
    return { ok: true };
  });
}
