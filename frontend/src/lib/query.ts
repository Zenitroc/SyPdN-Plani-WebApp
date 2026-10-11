import { useCallback, useEffect, useReducer, useRef } from 'react';
import { api } from './api';

// Caché de datos en memoria con "stale-while-revalidate": al volver a una pantalla se muestra
// al instante lo último conocido y se refresca en segundo plano.

type Entry = {
  data: unknown;
  error: Error | null;
  promise: Promise<void> | null;
  updatedAt: number;
  fetcher: (() => Promise<unknown>) | null;
  subscribers: Set<() => void>;
};

const cache = new Map<string, Entry>();
const DEFAULT_STALE_MS = 30_000;

function entryFor(key: string): Entry {
  let entry = cache.get(key);
  if (!entry) {
    entry = { data: undefined, error: null, promise: null, updatedAt: 0, fetcher: null, subscribers: new Set() };
    cache.set(key, entry);
  }
  return entry;
}

const notify = (entry: Entry) => entry.subscribers.forEach(listener => listener());

function run(key: string): Promise<void> {
  const entry = entryFor(key);
  if (entry.promise || !entry.fetcher) return entry.promise ?? Promise.resolve();
  const promise = entry.fetcher()
    .then(data => { entry.data = data; entry.error = null; entry.updatedAt = Date.now(); })
    .catch(error => { entry.error = error instanceof Error ? error : new Error(String(error)); })
    .finally(() => { if (entry.promise === promise) entry.promise = null; notify(entry); });
  entry.promise = promise;
  notify(entry);
  return promise;
}

/** Marca datos como viejos; los que están en pantalla se vuelven a pedir ya. Sin filtro, invalida todo. */
export function invalidate(match?: string | ((key: string) => boolean)): void {
  const matches = typeof match === 'function' ? match : (key: string) => !match || key.startsWith(match);
  for (const [key, entry] of cache) {
    if (!matches(key)) continue;
    entry.updatedAt = 0;
    if (entry.subscribers.size > 0) void run(key);
  }
}

export function setQueryData<T>(key: string, updater: (current: T) => T): void {
  const entry = cache.get(key);
  if (!entry || entry.data === undefined) return;
  entry.data = updater(entry.data as T);
  notify(entry);
}

export const getQueryData = <T,>(key: string): T | undefined => cache.get(key)?.data as T | undefined;

export function clearCache(): void {
  cache.clear();
}

export type QueryResult<T> = {
  data: T | undefined;
  error: Error | null;
  /** Primera carga: todavía no hay nada para mostrar. */
  loading: boolean;
  /** Hay un pedido en curso (primera carga o refresco). */
  fetching: boolean;
  reload: () => Promise<void>;
  /** Actualización optimista del dato en caché. */
  setData: (updater: (current: T) => T) => void;
};

type QueryOptions = { staleMs?: number; keepPrevious?: boolean };

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, options: QueryOptions = {}): QueryResult<T> {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const previous = useRef<T | undefined>(undefined);
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;

  useEffect(() => {
    if (!key) return;
    const entry = entryFor(key);
    entry.fetcher = () => fetcherRef.current();
    entry.subscribers.add(rerender);
    if (!entry.promise && Date.now() - entry.updatedAt > staleMs) void run(key);
    return () => { entry.subscribers.delete(rerender); };
  }, [key, staleMs]);

  const entry = key ? entryFor(key) : null;
  let data = entry?.data as T | undefined;
  if (data !== undefined) previous.current = data;
  else if (options.keepPrevious && key && !entry?.error) data = previous.current;
  if (!key) previous.current = undefined;

  const reload = useCallback(() => (key ? run(key) : Promise.resolve()), [key]);
  const setData = useCallback((updater: (current: T) => T) => { if (key) setQueryData(key, updater); }, [key]);

  return {
    data,
    error: entry?.error ?? null,
    loading: Boolean(key) && data === undefined && !entry?.error,
    fetching: Boolean(entry?.promise) || (Boolean(key) && entry?.updatedAt === 0 && !entry?.error),
    reload,
    setData,
  };
}

/** GET de la API cacheado por ruta. Pasar null para no pedir nada todavía. */
export const useApi = <T = any,>(path: string | null, options?: QueryOptions) =>
  useQuery<T>(path, () => api.get<T>(path as string), options);
