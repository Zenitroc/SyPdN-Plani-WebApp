const API_BASE = import.meta.env.VITE_API_BASE || '/api';

class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

export const session = {
  get token() { return localStorage.getItem('spn_token') || ''; },
  set token(value) { localStorage.setItem('spn_token', value); },
  clear() { localStorage.removeItem('spn_token'); localStorage.removeItem('spn_selected_course_id'); },
};

export async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (session.token && !options.public) headers.set('Authorization', `Bearer ${session.token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET', headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'No se pudo completar la operación.', response.status, payload);
  return payload?.data ?? payload;
}

export const api = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials, public: true }),
  me: () => request('/me'),
  courses: (scope = 'mine') => request(`/courses?scope=${encodeURIComponent(scope)}`),
  dashboard: (courseId, filters = {}) => request(`/dashboard?${new URLSearchParams({ course_id: courseId, ...filters })}`),
  resource: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};
