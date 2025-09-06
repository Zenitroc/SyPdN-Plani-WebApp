(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const i = parts.indexOf('public');
  const BASE_APP = i > 0 ? '/' + parts.slice(0, i).join('/') : '';
  const API_BASE = BASE_APP + '/api';
  window.BASE_APP = BASE_APP;
  window.API_BASE = API_BASE;

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
      const res = await fetch(API_BASE + url, opts);
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
