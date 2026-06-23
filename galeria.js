const $ = (id) => document.getElementById(id);

async function api(path, opts) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { window.location.replace('/login.html'); throw new Error('401'); }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
};

let me = null;

function renderCard(p) {
  const canDelete = me && (p.author_id === me.id || me.role === 'admin' || me.role === 'superadmin');
  const thumb = p.thumbnail_url
    ? `<img class="thumb" src="${p.thumbnail_url}" alt="${esc(p.title)}" loading="lazy" />`
    : `<div class="thumb empty">sem prévia</div>`;
  return `
    <div class="card" data-id="${p.id}">
      <a href="/?piece=${p.id}">${thumb}</a>
      <div class="card__body">
        <div class="card__title">${esc(p.title)}</div>
        <div class="card__meta">${esc(p.author_name || '—')} · ${fmtDate(p.updated_at)}${p.forked_from_id ? ' · cópia' : ''}</div>
      </div>
      <div class="card__actions">
        <a class="btn" href="/?piece=${p.id}">Abrir</a>
        <button data-act="dup" data-id="${p.id}" data-title="${esc(p.title)}">Duplicar</button>
        ${canDelete ? `<button class="link-danger" data-act="del" data-id="${p.id}">Excluir</button>` : ''}
      </div>
    </div>`;
}

async function load() {
  const { data } = await api('/api/pieces');
  const pieces = data.pieces || [];
  const grid = $('grid');
  if (!pieces.length) {
    grid.innerHTML = '';
    $('empty').style.display = 'block';
    return;
  }
  $('empty').style.display = 'none';
  grid.innerHTML = pieces.map(renderCard).join('');

  grid.querySelectorAll('button[data-act]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      $('msg').textContent = '';
      if (btn.dataset.act === 'dup') {
        const suggested = `${btn.dataset.title || 'Peça'} cópia`;
        const name = window.prompt('Nome da cópia:', suggested);
        if (name === null) return; // cancelou
        const title = name.trim() || suggested;
        const r = await api(`/api/pieces/${id}/duplicate`, {
          method: 'POST',
          body: JSON.stringify({ title })
        });
        if (r.ok && r.data.id) {
          // abre a cópia no editor, pronta para editar
          window.location.href = `/?piece=${r.data.id}`;
        } else {
          $('msg').textContent = 'Não foi possível duplicar.';
        }
      } else if (btn.dataset.act === 'del') {
        if (!window.confirm('Excluir esta peça? Esta ação não pode ser desfeita.')) return;
        const r = await api(`/api/pieces/${id}`, { method: 'DELETE' });
        if (r.ok) load();
        else $('msg').textContent = r.data.error === 'forbidden' ? 'Só o autor ou um admin pode excluir.' : 'Não foi possível excluir.';
      }
    });
  });
}

async function init() {
  const { ok, data } = await api('/api/auth/me');
  if (!ok) { window.location.replace('/login.html'); return; }
  me = data.user;
  $('who').textContent = me.name;
  if (me.role === 'admin' || me.role === 'superadmin') $('admin-link').style.display = '';
  $('logout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.replace('/login.html');
  });
  await load();
}

init();
