import { useCallback, useRef, useState } from 'react';

const FLASH_MS = 800;

/** Marca por un instante la celda recién guardada, como confirmación visual del autoguardado. */
export function useSavedFlash() {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, number>());

  const flash = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    setSaved(current => new Set(current).add(id));
    timers.current.set(id, window.setTimeout(() => {
      setSaved(current => { const next = new Set(current); next.delete(id); return next; });
    }, FLASH_MS));
  }, []);

  const isSaved = useCallback((id: string) => saved.has(id), [saved]);
  return { flash, isSaved };
}
