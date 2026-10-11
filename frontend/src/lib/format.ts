export const fullName = (person: { name?: string | null; last_name?: string | null } | null | undefined): string =>
  [person?.name, person?.last_name].filter(Boolean).join(' ').trim();

export function initials(text: string | null | undefined): string {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

/** Comparación que ignora mayúsculas y acentos, para los buscadores. */
export const normalize = (text: unknown): string =>
  String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const matches = (query: string, ...fields: unknown[]): boolean => {
  const needle = normalize(query).trim();
  return !needle || fields.some(field => normalize(field).includes(needle));
};

const dateFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDateFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Fechas de la API (YYYY-MM-DD), sin corrimiento por zona horaria. */
export function formatDate(value: string | null | undefined, short = false): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : (short ? shortDateFormat : dateFormat).format(date);
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const today = new Date();
  const target = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
}

export const percent = (value: number | null | undefined): string => (value == null ? '—' : `${value}%`);

export const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** Descarga una tabla como CSV que Excel abre directo (BOM + punto y coma). */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = [headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (text: string): string => normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'curso';

const dataUrlBytes = (dataUrl: string): number => Math.floor(((dataUrl.split(',')[1] || '').length * 3) / 4);

/**
 * Convierte una imagen elegida por el usuario en un data URL que entra en el límite del servidor:
 * la reduce y recomprime en el navegador en vez de rechazarla por tamaño.
 */
export async function imageToDataUrl(file: File, maxBytes: number, maxSide = 640): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
  if (file.size <= maxBytes && file.type !== 'image/svg+xml') return original;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    element.src = original;
  });
  let side = maxSide;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) break;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', 0.82);
    if (dataUrlBytes(result) <= maxBytes) return result;
    side = Math.round(side * 0.75);
  }
  throw new Error(`La imagen supera el límite de ${Math.round(maxBytes / 1024)} KB.`);
}
