const form = document.getElementById('login-form');
const msg = document.getElementById('msg');
const submit = document.getElementById('submit');

const ERRORS = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  missing_credentials: 'Preencha e-mail e senha.',
  too_many_attempts: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
};

// Se ja estiver logado, vai direto pro app.
(async () => {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) window.location.replace('/');
  } catch {}
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  submit.disabled = true;
  submit.textContent = 'Entrando...';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      })
    });
    if (res.ok) {
      window.location.replace('/');
      return;
    }
    const data = await res.json().catch(() => ({}));
    msg.textContent = ERRORS[data.error] || 'Não foi possível entrar.';
  } catch {
    msg.textContent = 'Erro de conexão. Tente novamente.';
  } finally {
    submit.disabled = false;
    submit.textContent = 'Entrar';
  }
});
