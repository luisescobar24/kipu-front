import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, escapeHtml, money, queryParams, safeSource, validateDates } from '../src/format';

describe('datos de contratación', () => {
  it('no presenta un monto ausente o cero como oportunidad gratuita', () => {
    expect(money(null, 'PEN')).toBe('No informado');
    expect(money(0, 'PEN')).toBe('No informado');
    expect(money('120.50', 'PEN')).toContain('120.50');
  });
  it('escapa contenido externo antes de dibujarlo', () => {
    expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  });
  it('solo abre fuentes oficiales https', () => {
    expect(safeSource('javascript:alert(1)')).toContain('prod2.seace.gob.pe');
    expect(safeSource('https://seace.gob.pe.evil.example')).toContain('prod2.seace.gob.pe');
  });
  it('codifica frases y omite filtros vacíos', () => {
    const params = queryParams({ ...DEFAULT_FILTERS, q: 'equipo & médico' });
    expect(params.get('q')).toBe('equipo & médico');
    expect(params.has('year')).toBe(false);
    expect(params.get('dataset')).toBe('recientes');
  });
  it('informa fechas invertidas', () => {
    expect(validateDates({ ...DEFAULT_FILTERS, date_from: '2026-12-01', date_to: '2026-11-01' })).toBeTruthy();
  });
});
