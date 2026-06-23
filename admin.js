// Painel admin. Superadmin ve/gerencia grupos e escolhe o grupo alvo.
// Admin de grupo gerencia so os usuarios do proprio grupo.
const $ = (id) => document.getElementById(id);
let me = null;
let selectedGroupId = null;

const ERR = {
  no_seats_available: 'Sem cadeiras disponíveis. Aumente o limite do grupo ou desative alguém.',
  email_taken: 'Já existe um usuário com esse e-mail.',
  weak_password: 'Senha muito curta (mínimo 8 caracteres).',
  slug_taken: 'Já existe um grupo com nome parecido.'
};
const errText = (d) => ERR[d.error] || d.message || 'Não foi possível concluir.';

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (res.status === 401) { window.location.replace('/login.html'); throw new Error('401'); }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function setMsg(el, text, ok) {
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}

async function loadGroups() {
  if (me.role !== 'superadmin') {
    $('groups-panel').classList.add('hidden');
    return;
  }
  const { data } = await api('/api/admin/groups');
  const groups = data.groups || [];
  $('groups-body').innerHTML = groups.map((g) => `
    <tr><td>${esc(g.name)}</td>
      <td>${g.used_seats}/${g.max_seats}</td>
      <td><span class="tag ${g.active ? 'on' : 'off'}">${g.active ? 'ativo' : 'inativo'}</span></td></tr>
  `).join('');

  // Picker de grupo para o superadmin escolher onde criar usuarios.
  const pickable = groups.filter((g) => g.slug !== 'system');
  $('group-picker-wrap').classList.remove('hidden');
  $('group-picker').innerHTML = pickable.map((g) =>
    `<option value="${g.id}">${esc(g.name)} (${g.used_seats}/${g.max_seats})</option>`).join('');
  if (pickable[0]) {
    selectedGroupId = pickable[0].id;
    $('group-picker').value = selectedGroupId;
  }
}

async function loadSeatsAndUsers() {
  const q = me.role === 'superadmin' && selectedGroupId ? `?group_id=${selectedGroupId}` : '';
  const seats = (await api('/api/admin/seats' + q)).data;
  if (seats && seats.max_seats !== undefined) {
    $('seats').innerHTML = `Cadeiras: <b>${seats.used}</b> usadas de <b>${seats.max_seats}</b> · <b>${seats.available}</b> disponível(is)`;
  }
  const users = (await api('/api/admin/users' + q)).data.users || [];
  $('users-body').innerHTML = users.map((u) => `
    <tr>
      <td>${esc(u.name)}</td>
      <td>${esc(u.email)}</td>
      <td>${u.role === 'admin' ? 'Admin' : 'Editor'}</td>
      <td><span class="tag ${u.active ? 'on' : 'off'}">${u.active ? 'ativo' : 'inativo'}</span></td>
      <td><button class="link" data-id="${u.id}" data-active="${u.active}">${u.active ? 'Desativar' : 'Reativar'}</button></td>
    </tr>`).join('');

  $('users-body').querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active !== 'true';
      const r = await api(`/api/admin/users/${btn.dataset.id}`, {
        method: 'PATCH', body: JSON.stringify({ active })
      });
      if (!r.ok) { setMsg($('user-msg'), errText(r.data), false); return; }
      await loadSeatsAndUsers();
    });
  });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function init() {
  const { ok, data } = await api('/api/auth/me');
  if (!ok) { window.location.replace('/login.html'); return; }
  me = data.user;
  if (me.role !== 'admin' && me.role !== 'superadmin') {
    document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Sem permissão de administração.</p>';
    return;
  }
  $('who').textContent = `${me.name} · ${me.role}`;

  $('logout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.replace('/login.html');
  });

  $('group-picker').addEventListener('change', async (e) => {
    selectedGroupId = e.target.value;
    await loadSeatsAndUsers();
  });

  $('group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await api('/api/admin/groups', {
      method: 'POST',
      body: JSON.stringify({ name: $('g-name').value.trim(), max_seats: Number($('g-seats').value) })
    });
    if (!r.ok) { setMsg($('group-msg'), errText(r.data), false); return; }
    setMsg($('group-msg'), 'Grupo criado.', true);
    $('group-form').reset();
    await loadGroups();
    await loadSeatsAndUsers();
  });

  $('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: $('u-name').value.trim(),
      email: $('u-email').value.trim(),
      password: $('u-pass').value,
      role: $('u-role').value
    };
    if (me.role === 'superadmin' && selectedGroupId) body.group_id = selectedGroupId;
    const r = await api('/api/admin/users', { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) { setMsg($('user-msg'), errText(r.data), false); return; }
    setMsg($('user-msg'), 'Usuário criado.', true);
    $('user-form').reset();
    await loadGroups();
    await loadSeatsAndUsers();
  });

  await loadGroups();
  await loadSeatsAndUsers();
}

init();
