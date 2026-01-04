// Helpers API (Los dejamos igual)
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

// Envolvemos todo en DOMContentLoaded para asegurar que el HTML existe
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Login.js: Iniciando script...'); // Debug

  // 1. Intentamos renderizar el menú de forma segura
  try {
    if (typeof renderMenu === 'function') {
      renderMenu();
    } else {
      console.warn('renderMenu no está definido todavía.');
    }
  } catch (e) {
    console.error('Error al renderizar menú:', e);
  }

  // 2. Referencias al DOM
  const homeUrl = window.APP_ROUTES?.pages?.home || '../home/';
  const loginForm = document.getElementById('loginForm');
  const loginMsg  = document.getElementById('loginMsg');
  const username  = document.getElementById('username');
  const password  = document.getElementById('password');
  const toggle    = document.getElementById('showPass');
  const remember  = document.getElementById('remember');
  const forgotBtn = document.getElementById('forgotBtn');

  // Modal: Solicitar cuenta (ya lo tenías)
  const requestAccountBtn  = document.getElementById('requestAccount');
  const requestModal       = document.getElementById('requestModal');
  const closeRequestModal  = document.getElementById('closeRequestModal');

  // Modal: Olvidé mi contraseña (nuevo)
  const forgotModal      = document.getElementById('forgotModal');
  const closeForgotModal = document.getElementById('closeForgotModal');

  // Debug para ver si encontró los elementos
  if(!requestAccountBtn) console.warn('No encuentro el botón "requestAccount"');
  if(!requestModal) console.warn('No encuentro el div "requestModal"');
  if(!forgotBtn) console.warn('No encuentro el botón "forgotBtn"');
  if(!forgotModal) console.warn('No encuentro el div "forgotModal"');

  // 3. Helpers modales (genéricos)
  const openModal = (modal) => {
    if (!modal) return;
    modal.style.display = 'flex'; // Forzamos display flex
    // pequeño delay para animación
    setTimeout(() => {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }, 10);
    document.body.style.overflow = 'hidden';
  };

  const closeAnyModal = (modal) => {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
    document.body.style.overflow = '';
  };

  // 4. Listeners: Solicitar cuenta
  if (requestAccountBtn) {
    requestAccountBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Click en solicitar cuenta');
      openModal(requestModal);
    });
  }

  if (closeRequestModal) {
    closeRequestModal.addEventListener('click', () => closeAnyModal(requestModal));
  }

  if (requestModal) {
    requestModal.addEventListener('click', (e) => {
      if (e.target === requestModal) closeAnyModal(requestModal);
    });
  }

  // 5. Listeners: Olvidé mi contraseña (modal)
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Click en olvidé mi contraseña');
      openModal(forgotModal);
    });
  }

  if (closeForgotModal) {
    closeForgotModal.addEventListener('click', () => closeAnyModal(forgotModal));
  }

  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) closeAnyModal(forgotModal);
    });
  }

  // Escape cierra cualquier modal activo
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (requestModal?.classList.contains('active')) closeAnyModal(requestModal);
    if (forgotModal?.classList.contains('active')) closeAnyModal(forgotModal);
  });

  // 6. Lógica de "Ver contraseña"
  if (password && toggle) {
    const hide = () => (password.type = 'password');
    toggle.addEventListener('mousedown', () => (password.type = 'text'));
    toggle.addEventListener('mouseup', hide);
    toggle.addEventListener('mouseleave', hide);

    // Mobile/touch friendly
    toggle.addEventListener('touchstart', () => (password.type = 'text'), { passive: true });
    toggle.addEventListener('touchend', hide);
    toggle.addEventListener('touchcancel', hide);
  }

  // 7. Recordar usuario
  if (remember && username && password) {
    const saved = localStorage.getItem('remember') === 'true';
    if (saved) {
      remember.checked = true;
      username.value = localStorage.getItem('username') || '';
      password.value = localStorage.getItem('password') || '';
    }
  }

  // 8. Chequeo de Token (Para redirigir si ya está logueado)
  try {
    if (typeof api !== 'undefined' && api.getToken()) {
      location.href = homeUrl;
      return;
    }
  } catch (e) {
    console.warn('API no inicializada o error de token', e);
  }

  // 9. Submit del Login
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      if (loginMsg) loginMsg.textContent = '';

      try {
        const userVal = (username?.value || '').trim();
        const passVal = password?.value || '';

        if (!userVal || !passVal) {
          throw new Error('Completá usuario y contraseña.');
        }

        // Verificamos que 'api' exista antes de llamar
        if (typeof api === 'undefined') throw new Error('Error interno: API no cargada');

        const r = await apiTryPost('/auth/login', {
          username: userVal,
          password: passVal
        }, { noAuth: true });

        const tk = r?.token || r?.data?.token;
        if (!tk) throw new Error('Credenciales inválidas o token no recibido');

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
        console.error(err);
        if (loginMsg) loginMsg.textContent = err.message || 'Error de login';
      }
    };
  }
});
