(function () {
  const DEFAULT_ROUTES = {
    apiBase: '/api',
    assetsBase: '/assets',
    serviceWorker: null,
    pages: {
      home: '/pages/home/index.html',
      login: '/pages/login/index.html',
      perfil: '/pages/perfil/index.html',
      cursoDashboard: '/pages/curso-dashboard/index.html',
      planificacion: '/pages/planificacion/index.html',
      estudiantes: '/pages/estudiantes/index.html',
      grupos: '/pages/grupos/index.html',
      entregas: '/pages/entregas/index.html',
      parciales: '/pages/parciales/index.html',
      notasFinales: '/pages/notas-finales/index.html',
      asistencia: '/pages/asistencia/index.html',
      reportes: '/pages/reportes/index.html',
      cursosAdmin: '/pages/cursos-admin/index.html',
      usuariosAdmin: '/pages/usuarios-admin/index.html',
      alumnosGlobal: '/pages/alumnos-global/index.html',
    },
  };

  function detectBaseApp() {
    const parts = location.pathname.split('/').filter(Boolean);
    const knownRoots = ['pages', 'assets', 'api', 'login'];
    const index = parts.findIndex(part => knownRoots.includes(part));
    return index > 0 ? '/' + parts.slice(0, index).join('/') : '';
  }

  function normalizePath(base, path) {
    if (!path) return base;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return base + path;
    return `${base}/${path}`;
  }

  function mergeRoutes(config) {
    return {
      ...DEFAULT_ROUTES,
      ...config,
      pages: {
        ...DEFAULT_ROUTES.pages,
        ...(config?.pages || {}),
      },
    };
  }

  function buildRoutes(base, config) {
    const merged = mergeRoutes(config || {});
    const pages = Object.keys(merged.pages).reduce((acc, key) => {
      acc[key] = normalizePath(base, merged.pages[key]);
      return acc;
    }, {});

    return {
      apiBase: normalizePath(base, merged.apiBase || '/api'),
      assetsBase: normalizePath(base, merged.assetsBase || '/assets'),
      serviceWorker: merged.serviceWorker ? normalizePath(base, merged.serviceWorker) : null,
      pages,
    };
  }

  function updateRoutes(config) {
    window.APP_ROUTES = buildRoutes(window.BASE_APP, config);
    window.API_BASE = window.APP_ROUTES.apiBase;
  }

  async function loadRoutesConfig() {
    try {
      const res = await fetch(`${window.BASE_APP}/assets/routes.json`, { cache: 'no-store' });
      if (!res.ok) return;
      updateRoutes(await res.json());
    } catch (e) {
      console.warn('[routes] No se pudo cargar routes.json', e);
    }
  }

  function clearSessionState() {
    localStorage.removeItem('spn_token');
    localStorage.removeItem('spn_selected_course_id');
    localStorage.removeItem('password');
    sessionStorage.removeItem('spn_selected_course_id');
  }

  function isLoginPage() {
    return location.pathname.includes('/pages/login/') || location.pathname.endsWith('/login/');
  }

  function redirectToLogin(message) {
    clearSessionState();
    if (message) sessionStorage.setItem('spn_auth_message', message);
    if (isLoginPage()) return;

    const loginRoute = window.getPageRoute
      ? window.getPageRoute('login')
      : normalizePath(window.BASE_APP, '/pages/login/');
    location.href = loginRoute;
  }

  function handleAuthError(status) {
    if (status !== 401 && status !== 403) return;
    redirectToLogin('Tu sesion expiro, volve a ingresar.');
  }

  async function unregisterServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
      if (registrations.length) {
        console.info('[SW] Service worker desactivado temporalmente.');
      }
    } catch (e) {
      console.warn('[SW] No se pudo desactivar el service worker', e);
    }
  }

  function joinApiUrl(url) {
    if (/^https?:\/\//i.test(url)) return url;
    const apiBase = window.API_BASE || '/api';
    if (url === apiBase || url.startsWith(`${apiBase}/`)) return url;
    if (url.startsWith('/api/')) return normalizePath(window.BASE_APP, url);
    return apiBase + (url.startsWith('/') ? url : `/${url}`);
  }

  window.BASE_APP = detectBaseApp();
  updateRoutes(DEFAULT_ROUTES);
  window.getPageRoute = function (key) {
    return window.APP_ROUTES.pages?.[key] || normalizePath(window.BASE_APP, `/pages/${key}/`);
  };

  const api = {
    setToken(t) { localStorage.setItem('spn_token', t); },
    getToken() { return localStorage.getItem('spn_token') || ''; },
    clearToken() { clearSessionState(); },
    isAuthError(errorOrStatus) {
      const status = typeof errorOrStatus === 'number' ? errorOrStatus : errorOrStatus?.status;
      return status === 401 || status === 403;
    },
    handleAuthError(status) { handleAuthError(status); },
    async request(method, url, body, { noAuth = false } = {}) {
      const headers = {};
      if (!noAuth) {
        const tk = this.getToken();
        if (tk) headers.Authorization = `Bearer ${tk}`;
      }

      const opts = { method, headers, cache: 'no-store' };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }

      const res = await fetch(joinApiUrl(url), opts);
      if (res.status === 204) return null;

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { error: text || `HTTP ${res.status}` };
      }

      if (!res.ok) {
        if (!noAuth) handleAuthError(res.status);
        const error = new Error(data?.error || `HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    },
    get(url, opt) { return this.request('GET', url, undefined, opt); },
    post(url, body, opt) { return this.request('POST', url, body, opt); },
  };
  window.api = api;

  function createLoader() {
    if (window.pageLoader) return window.pageLoader;
    if (!document.body) return null;

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay is-visible';
    overlay.innerHTML = `
      <div class="loading-card" role="status" aria-live="polite">
        <div class="loading-text" data-loader-text>Preparando la vista...</div>
        <div class="loading-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const show = (message) => {
      if (message) {
        const text = overlay.querySelector('[data-loader-text]');
        if (text) text.textContent = message;
      }
      overlay.classList.add('is-visible');
    };
    const hide = () => overlay.classList.remove('is-visible');

    window.pageLoader = { show, hide, element: overlay };
    window.addEventListener('beforeunload', () => show('Redirigiendo...'));
    window.addEventListener('load', hide, { once: true });
    if (document.readyState === 'complete') hide();
    return window.pageLoader;
  }

  loadRoutesConfig();
  unregisterServiceWorkers();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createLoader);
  } else {
    createLoader();
  }
})();
