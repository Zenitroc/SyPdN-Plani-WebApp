(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const i = parts.indexOf('public');
  const BASE_APP = i > 0 ? '/' + parts.slice(0, i).join('/') : '';
  const API_BASE = BASE_APP + '/api';
  window.BASE_APP = BASE_APP;
  window.API_BASE = API_BASE;

  class ApiError extends Error {
    constructor(message, { status, code, details, raw } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.details = details;
      this.raw = raw;
    }
  }

  function parseJson(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return { _nonJson: text };
    }
  }

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
      const opts = { method, headers };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(API_BASE + url, opts);
      if (res.status === 204) return null;
      const text = await res.text();
      const data = parseJson(text);
      if (!res.ok) {
        const errorMessage = data?.error
          || data?.message
          || (data?._nonJson ? data._nonJson.trim() : '')
          || `HTTP ${res.status}`;
        const error = new ApiError(errorMessage, {
          status: res.status,
          code: data?.code,
          details: data?.extra ?? data?.details,
          raw: data,
        });
        if (res.status === 401 || res.status === 403) {
          this.clearToken();
          window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: { status: res.status } }));
        }
        throw error;
      }
      if (data && data._nonJson) return data._nonJson;
      return data;
    },
    get(url) { return this.request('GET', url); },
    post(url, body, opt) { return this.request('POST', url, body, opt); },
  };
  window.api = api;
  window.ApiError = ApiError;
})();