import { expect, test } from '@playwright/test';

const record = {
  id: 'test-record', dataset: 'recientes', entity: 'HOSPITAL DE PRUEBA',
  nomenclature: 'LP-1-2026-TEST', description: 'Adquisición de jeringas descartables para uso médico <img src=x onerror=alert(1)>',
  year: 2026, published_at: '2026-11-17T10:00:00-05:00', object: 'Bien', amount: '4500.50', currency: 'PEN',
  medical_mask: 1, review_mask: 0, evidence: ['Jeringa hipodérmica: jeringa descartable'],
  source_url: 'https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml',
  source_id: null, version: '3', first_seen: null,
};
test.beforeEach(async ({ page }) => {
  // Fixtures exclusivamente en tests. La aplicación publicada nunca inserta datos simulados.
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    let body: unknown;
    if (url.pathname.endsWith('/metadata')) body = { dictionary: { version: 'test', categorias: [{ id: 'jeringas', nombre: 'Jeringas', grupo: 'insumos', revision: false }], nota: 'Coincidencias textuales' }, years: [2026], objects: ['Bien'], coverage: {}, notes: [] };
    else if (url.pathname.endsWith('/collector/status')) body = { worker_online: false, runtime: {}, objects: {}, interval_seconds: 300, mode: 'consulta_periodica', note: '' };
    else if (url.pathname.endsWith('/summary')) body = { total: url.searchParams.get('q') === 'no-existe' ? 0 : 1, entities: 1, medical: 1, review: 0, amounts: [], top_entities: [{ entity: record.entity, total: 1 }], series: [{ label: '2026-11', total: 1 }], dataset: 'recientes', unit: 'publicaciones' };
    else if (url.pathname.endsWith('/records/test-record')) body = record;
    else body = { items: url.searchParams.get('q') === 'no-existe' ? [] : [record], total: url.searchParams.get('q') === 'no-existe' ? 0 : 1, page: 1, page_size: 20, unit: 'publicaciones' };
    return route.fulfill({ json: body });
  });
});

test('búsqueda, detalle, contenido externo seguro y guardado', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: record.nomenclature, exact: true })).toBeVisible();
  await expect(page.locator('#records img')).toHaveCount(0);
  await page.getByRole('button', { name: record.nomenclature, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Consultar en SEACE' })).toHaveAttribute('href', /seace.gob.pe/);
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByLabel('Producto o palabra clave').fill('jeringas');
  await page.getByRole('button', { name: 'Guardar búsqueda', exact: true }).click();
  await page.getByRole('button', { name: 'Mis búsquedas', exact: true }).click();
  await expect(page.locator('.saved-search strong')).toHaveText('jeringas');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByLabel('Producto o palabra clave').fill('no-existe');
  await page.getByRole('button', { name: 'Buscar oportunidades', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No encontramos coincidencias' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('informa errores de conexión y fechas invertidas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#dashboard')).toBeVisible();
  if (await page.locator('#filters-toggle').isVisible()) await page.locator('#filters-toggle').click();
  await page.getByLabel('Desde', { exact: true }).fill('2026-12-01');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-11-01');
  await page.getByRole('button', { name: 'Buscar oportunidades' }).click();
  await expect(page.locator('#filter-error')).toContainText('fecha inicial');
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await page.route('**/api/v1/records?**', route => route.abort());
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No pudimos cargar la información' })).toBeVisible();
});

test('abre el enlace que llegaría por correo', async ({ page }) => {
  await page.goto('/?registro=test-record');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: record.nomenclature })).toBeVisible();
});

test('renueva los resultados con los filtros y retoma al volver a la pestaña', async ({ page }) => {
  await page.clock.install();
  let name = record.nomenclature;
  let query = '';
  let requests = 0;
  await page.route('**/api/v1/records?**', route => {
    requests++;
    query = new URL(route.request().url()).searchParams.get('q') || '';
    return route.fulfill({ json: { items: [{ ...record, nomenclature: name }], total: 1, page: 1, page_size: 20, unit: 'publicaciones' } });
  });
  await page.goto('/');
  await expect(page.locator('#dashboard')).toBeVisible();
  await page.getByLabel('Producto o palabra clave').fill('jeringas');
  await page.getByRole('button', { name: 'Buscar oportunidades', exact: true }).click();
  await expect.poll(() => query).toBe('jeringas');
  name = 'LP-NUEVA-LECTURA';
  await page.clock.fastForward(61000);
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByLabel('Producto o palabra clave')).toHaveValue('jeringas');
  await expect(page.locator('#data-sync')).toContainText('Actualización automática cada minuto');
  await expect(page.locator('#loading')).toBeHidden();
  const before = requests;
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }));
  name = 'LP-AL-VOLVER';
  await page.clock.fastForward(61000);
  expect(requests).toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  expect(query).toBe('jeringas');
});

test('conserva los resultados cuando falla una actualización automática', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('#dashboard')).toBeVisible();
  await page.route('**/api/v1/records?**', route => route.abort());
  await page.clock.fastForward(61000);
  await expect(page.locator('#data-sync')).toContainText('Conservamos los resultados');
  await expect(page.locator('#dashboard')).toBeVisible();
  await expect(page.getByRole('button', { name: record.nomenclature, exact: true })).toBeVisible();
  await expect(page.locator('#error-state')).toBeHidden();
  await expect(page.locator('#loading')).toBeHidden();
});
