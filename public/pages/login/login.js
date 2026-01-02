if (typeof renderMenu === 'function') {
  renderMenu();
}

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
    const homeUrl = window.APP_ROUTES?.pages?.home || '../home/';
    const loginForm = document.getElementById('loginForm');
    const loginMsg = document.getElementById('loginMsg');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const toggle = document.getElementById('showPass');
    const remember = document.getElementById('remember');
    const forgotBtn = document.getElementById('forgotBtn');
    const requestAccount = document.getElementById('requestAccount');
    const requestModal = document.getElementById('requestModal');
    const closeRequestModal = document.getElementById('closeRequestModal');

    // Mostrar contraseña mientras se mantiene presionado
    if (password && toggle) {
      const hide = () => (password.type = 'password');
      toggle.addEventListener('mousedown', () => (password.type = 'text'));
      toggle.addEventListener('mouseup', hide);
      toggle.addEventListener('mouseleave', hide);
    }

    if (remember && username && password) {
      const saved = localStorage.getItem('remember') === 'true';
      if (saved) {
        remember.checked = true;
        username.value = localStorage.getItem('username') || '';
        password.value = localStorage.getItem('password') || '';
      }
    }

    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        alert('Por favor contactá a un administrador info@spn.com.ar');
      });
    }

    const openRequestModal = () => {
      if (!requestModal) return;
      requestModal.style.display = 'flex';
      requestModal.classList.add('active');
      requestModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
      if (!requestModal) return;
      requestModal.classList.remove('active');
      requestModal.setAttribute('aria-hidden', 'true');
      requestModal.style.display = 'none';
      document.body.style.overflow = '';
    };

    if (requestAccount) {
      requestAccount.addEventListener('click', (e) => {
        e.preventDefault();
        openRequestModal();
      });
    }
    if (closeRequestModal) {
      closeRequestModal.addEventListener('click', closeModal);
    }
    if (requestModal) {
      requestModal.addEventListener('click', (e) => {
        if (e.target === requestModal) closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });
    }

  // Si ya hay token, ir al home
  if (api.getToken()) {
    location.href = homeUrl;
    return;
  }

  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      loginMsg.textContent = '';
      try {
        const userVal = username.value.trim();
        const passVal = password.value;
        const r = await apiTryPost('/auth/login', {
          username: userVal,
          password: passVal
        }, { noAuth: true });
        const tk = r?.token || r?.data?.token;
        if (!tk) throw new Error('Token no recibido');
        if (remember && remember.checked) {
          localStorage.setItem('remember', 'true');
          localStorage.setItem('username', userVal);
          localStorage.setItem('password', passVal);
        } else {
          localStorage.removeItem('remember');
          localStorage.removeItem('username');
          localStorage.removeItem('password');
        }
        api.setToken(tk);
        location.href = homeUrl;
      } catch (err) {
        loginMsg.textContent = err.message || 'Error de login';
      }
    };
  }
})();
