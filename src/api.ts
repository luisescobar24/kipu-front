import { queryParams } from './format';
import type { Filters } from './types';

const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
export const API_BASE = configuredUrl.replace(/\/+$/, '');
export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}
export function configurationError(): string | null {
  if (!API_BASE) return 'Falta configurar la dirección de la API. TI debe definir VITE_API_BASE_URL y volver a publicar la página.';
  try {
    const url = new URL(API_BASE);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    if (location.protocol === 'https:' && url.protocol !== 'https:') return 'La página publicada necesita una API con HTTPS.';
    return null;
  } catch { return 'La dirección configurada para la API no es válida.'; }
}
export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const error = configurationError();
  if (error) throw new ApiError(error);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('No pudimos conectar con la API. Comprueba tu conexión y vuelve a intentar.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(typeof body.detail === 'string' ? body.detail : `No se pudo completar la consulta (${response.status}).`, response.status);
  }
  return response.json() as Promise<T>;
}
export async function downloadCsv(filters: Filters): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/records/export.csv?${queryParams(filters)}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail || 'No se pudo exportar. Intenta reducir los filtros.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url; link.download = `kipu-${filters.dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
