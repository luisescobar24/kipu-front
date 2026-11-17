import type { Filters } from './types';

export const DEFAULT_FILTERS: Filters = {
  dataset: 'recientes', q: '', entity: '', year: '', object: '', medical: 'match',
  category: '', date_from: '', date_to: '', sort: 'newest', page: 1, page_size: 20,
};

export const number = (value: number) => new Intl.NumberFormat('es-PE').format(value);
export function dateTime(value: string | null | undefined): string {
  if (!value) return 'Sin información';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin información';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(date);
}
export function money(value: number | string | null, currency: string): string {
  if (value === null || !Number.isFinite(Number(value)) || Number(value) <= 0) return 'No informado';
  if (!/^[A-Z]{3}$/.test(currency)) return `${number(Number(value))} · ${currency}`;
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
}
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
export function safeSource(value: string): string {
  const fallback = 'https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'seace.gob.pe' || url.hostname.endsWith('.seace.gob.pe') || url.hostname === 'contratacionesabiertas.oece.gob.pe') ? url.href : fallback;
  } catch { return fallback; }
}
export function queryParams(filters: Filters): URLSearchParams {
  return new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)]));
}
export function validateDates(filters: Filters): string | null {
  return filters.date_from && filters.date_to && filters.date_from > filters.date_to ? 'La fecha inicial debe ser anterior o igual a la final.' : null;
}
export function readSaved(): Filters[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('kipu.saved.v1') || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((item): item is Filters => !!item && typeof item === 'object' &&
      ['recientes', 'historico'].includes(item.dataset) && typeof item.q === 'string' && typeof item.entity === 'string' &&
      ['all', 'match', 'review'].includes(item.medical)).slice(0, 5).map(item => ({ ...DEFAULT_FILTERS, ...item, page: 1 }));
  } catch { return []; }
}
