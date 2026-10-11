import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, session, UNAUTHORIZED_EVENT } from '../lib/api';
import { clearCache } from '../lib/query';
import { hasCapability, type Capability } from '../lib/permissions';

export type User = {
  id: number;
  name: string;
  last_name: string;
  username: string;
  email: string;
  personal_email: string;
  legajo: string;
  phone: string;
  photo_url: string | null;
  roles: string[];
  course_ids: number[];
  must_change_password: number;
};

type AuthValue = {
  user: User | null;
  /** Verificando un token guardado al abrir la app. */
  booting: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  can: (capability: Capability) => boolean;
};

const AuthContext = createContext<AuthValue | null>(null);
const SESSION_NOTICE_KEY = 'spn_auth_message';

/** Mensaje pendiente para mostrar en el login (p. ej. sesión expirada). Se consume al leerlo. */
export function takeSessionNotice(): string {
  const notice = sessionStorage.getItem(SESSION_NOTICE_KEY) || '';
  sessionStorage.removeItem(SESSION_NOTICE_KEY);
  return notice;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(Boolean(session.token));

  const refreshUser = useCallback(async () => { setUser(await api.get<User>('/me')); }, []);

  useEffect(() => {
    if (!session.token) return;
    // Un 401 ya limpia la sesión; cualquier otro error deja al usuario en el login con el token intacto.
    refreshUser().catch(() => setUser(null)).finally(() => setBooting(false));
  }, [refreshUser]);

  useEffect(() => {
    const onUnauthorized = () => {
      sessionStorage.setItem(SESSION_NOTICE_KEY, 'Tu sesión expiró. Volvé a ingresar.');
      clearCache();
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (credentials: { username: string; password: string }) => {
    const result = await api.login(credentials);
    if (!result?.token) throw new Error('El servidor no devolvió una sesión válida.');
    session.token = result.token;
    clearCache();
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    session.clear();
    clearCache();
    setUser(null);
  }, []);

  const can = useCallback((capability: Capability) => hasCapability(user?.roles, capability), [user]);

  const value = useMemo(() => ({ user, booting, login, logout, refreshUser, can }), [user, booting, login, logout, refreshUser, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return value;
}
