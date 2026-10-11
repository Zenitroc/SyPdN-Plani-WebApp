const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'spn_token';

/** Se emite cuando la API rechaza el token: la sesión se cierra sola. */
export const UNAUTHORIZED_EVENT = 'spn:unauthorized';

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export const session = {
  get token(): string { return localStorage.getItem(TOKEN_KEY) || ''; },
  set token(value: string) { localStorage.setItem(TOKEN_KEY, value); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

type RequestOptions = {
  method?: 'GET' | 'POST';
  /** Cuerpo JSON. */
  body?: unknown;
  /** Cuerpo multipart (subida de archivos). */
  form?: FormData;
  /** No envía el token ni cierra la sesión ante un 401 (login). */
  anonymous?: boolean;
};

// La API responde mensajes técnicos en inglés para los casos de acceso; se traducen acá una sola vez.
function friendlyMessage(status: number, raw: string): string {
  if (status === 401 && /token/i.test(raw)) return 'Tu sesión expiró. Volvé a ingresar.';
  if (status === 403 && /^forbidden \(course\)/i.test(raw)) return 'No tenés acceso a este curso.';
  if (status === 403 && /^forbidden/i.test(raw)) return 'Tu rol no permite realizar esta acción.';
  if (status === 404 && /^not found$/i.test(raw)) return 'El recurso solicitado no existe.';
  if (status >= 500) return raw ? `El servidor no pudo completar la operación. ${raw.replace(/^server error:\s*/i, '')}` : 'El servidor no pudo completar la operación.';
  return raw || 'No se pudo completar la operación.';
}

export async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (session.token && !options.anonymous) headers.set('Authorization', `Bearer ${session.token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisá tu conexión.', 0);
  }

  if (response.status === 204) return null as T;
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { /* respuesta no JSON: se trata como error abajo */ }

  if (!response.ok || (payload === null && text !== '')) {
    const raw = typeof payload?.error === 'string' ? payload.error : payload?.error?.message || '';
    if (response.status === 401 && !options.anonymous) {
      session.clear();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(friendlyMessage(response.ok ? 500 : response.status, raw), response.status, payload);
  }
  // Algunos endpoints envuelven la respuesta en { data } y otros no.
  return (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload ? payload.data : payload) as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body: unknown = {}) => request<T>(path, { method: 'POST', body }),
  upload: <T = any>(path: string, form: FormData) => request<T>(path, { method: 'POST', form }),
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string }>('/auth/login', { method: 'POST', body: credentials, anonymous: true }),
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Ocurrió un error inesperado.';
