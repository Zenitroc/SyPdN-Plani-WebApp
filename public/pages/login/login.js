renderMenu();

// Helpers API con fallback /api
function isNotFound(val){
  const s = String(val?.message || val?.error || val || '').toLowerCase();
  return s.includes('not found') || s.includes('404');
}
async function apiTryPost(path, body, opts){
  try{
    const r = await api.post(path, body, opts);
    if (r && r.error && isNotFound(r)) throw new Error('NF1');
    return r;
  }catch(e1){
    try{
      const r2 = await api.post('/api' + path, body, opts);
      if (r2 && r2.error && isNotFound(r2)) throw new Error('NF2');
      return r2;
    }catch(e2){ throw e2; }
  }
}

(async function init(){
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');

  // Si ya hay token, ir al home
  if (api.getToken()) {
    location.href = '../home/';
    return;
  }

  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      loginMsg.textContent = '';
      try {
        const r = await apiTryPost('/auth/login', {
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value
        }, { noAuth: true });
        const tk = r?.token || r?.data?.token;
        if (!tk) throw new Error('Token no recibido');
        api.setToken(tk);
        location.href = '../home/';
      } catch (err) {
        loginMsg.textContent = err.message || 'Error de login';
      }
    };
  }
})();