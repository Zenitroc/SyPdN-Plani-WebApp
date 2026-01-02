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
    const loginMsg = document.getElementById('loginMsg');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const toggle = document.getElementById('showPass');
    const remember = document.getElementById('remember');
    const forgotBtn = document.getElementById('forgotBtn');
    
    // Referencias del Modal (IMPORTANTE)
    const requestAccountBtn = document.getElementById('requestAccount');
    const requestModal = document.getElementById('requestModal');
    const closeRequestModal = document.getElementById('closeRequestModal');

    // Debug para ver si encontró los elementos
    if(!requestAccountBtn) console.error('Error: No encuentro el botón "requestAccount"');
    if(!requestModal) console.error('Error: No encuentro el div "requestModal"');

    // 3. Lógica del Modal (Funciones)
    const openRequestModal = () => {
        if (!requestModal) return;
        requestModal.style.display = 'flex'; // Forzamos display flex
        // Pequeño timeout para permitir que el navegador procese el display:flex antes de la clase (para animación)
        setTimeout(() => {
            requestModal.classList.add('active');
            requestModal.setAttribute('aria-hidden', 'false');
        }, 10);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        if (!requestModal) return;
        requestModal.classList.remove('active');
        requestModal.setAttribute('aria-hidden', 'true');
        // Esperamos a que termine la animación CSS (.22s) antes de ocultar
        setTimeout(() => {
             requestModal.style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
    };

    // 4. Listeners del Modal
    if (requestAccountBtn) {
        requestAccountBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Evita que el form intente enviarse si está dentro de uno
            console.log('Click en solicitar cuenta'); // Debug
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
            if (e.key === 'Escape' && requestModal.classList.contains('active')) closeModal();
        });
    }

    // 5. Lógica de "Ver contraseña"
    if (password && toggle) {
        const hide = () => (password.type = 'password');
        toggle.addEventListener('mousedown', () => (password.type = 'text'));
        toggle.addEventListener('mouseup', hide);
        toggle.addEventListener('mouseleave', hide);
    }

    // 6. Recordar usuario
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

    // 7. Chequeo de Token (Para redirigir si ya está logueado)
    // Usamos try/catch por si 'api' no existe
    try {
        if (typeof api !== 'undefined' && api.getToken()) {
            location.href = homeUrl;
            return;
        }
    } catch (e) {
        console.warn('API no inicializada o error de token', e);
    }

    // 8. Submit del Login
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            loginMsg.textContent = '';
            try {
                const userVal = username.value.trim();
                const passVal = password.value;
                
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
                loginMsg.textContent = err.message || 'Error de login';
            }
        };
    }
});