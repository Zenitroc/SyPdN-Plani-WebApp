(function () {
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

  function loadRoutesConfig(base) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${base}/assets/routes.json`, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        return JSON.parse(xhr.responseText);
      }
    } catch (e) {
      console.warn('[routes] No se pudo cargar routes.json', e);
    }
    return {};
  }

  const BASE_APP = detectBaseApp();
  const routesConfig = loadRoutesConfig(BASE_APP);
  const pagesConfig = routesConfig.pages || {};
  const pages = Object.keys(pagesConfig).reduce((acc, key) => {
    acc[key] = normalizePath(BASE_APP, pagesConfig[key]);
    return acc;
  }, {});

  const APP_ROUTES = {
    apiBase: normalizePath(BASE_APP, routesConfig.apiBase || '/api'),
    assetsBase: normalizePath(BASE_APP, routesConfig.assetsBase || '/assets'),
    serviceWorker: normalizePath(BASE_APP, routesConfig.serviceWorker || '/sw.js'),
    pages,
  };

  window.BASE_APP = BASE_APP;
  window.API_BASE = APP_ROUTES.apiBase;
  window.APP_ROUTES = APP_ROUTES;
  window.getPageRoute = function (key) {
    return APP_ROUTES.pages?.[key] || normalizePath(BASE_APP, `/pages/${key}/`);
  };

  const api = {
    setToken(t) { localStorage.setItem('spn_token', t); },
    getToken() { return localStorage.getItem('spn_token') || ''; },
    clearToken() { localStorage.removeItem('spn_token'); },
    async request(method, url, body, { noAuth = false } = {}) {
      const headers = {};
      if (!noAuth) {
        const tk = this.getToken();
        if (tk) headers['Authorization'] = `Bearer ${tk}`;
      }
      let opts = { method, headers };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(window.API_BASE + url, opts);
      if (res.status === 204) return null;
      const text = await res.text();
      let data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      return data;
    },
    get(url) { return this.request('GET', url); },
    post(url, body, opt) { return this.request('POST', url, body, opt); },
  };
  window.api = api;
})();