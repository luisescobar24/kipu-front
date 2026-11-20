import './styles.css';
import './readability.css';
import { API_BASE, api, configurationError, downloadCsv } from './api';
import { DEFAULT_FILTERS, dateTime, escapeHtml as e, money, number, queryParams, readSaved, safeSource, validateDates } from './format';
import type { CollectorStatus, Filters, Metadata, Page, Procurement, Summary } from './types';

const icons: Record<string, string> = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2"/>',
  external: '<path d="M14 3h7v7m0-7L11 13M10 3H3v18h18v-7"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
};
const icon = (name: string) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Falta el elemento ${selector}`);
  return found;
}

let filters: Filters = { ...DEFAULT_FILTERS };
let metadata: Metadata | null = null;
let currentPage: Page | null = null;
let request: AbortController | null = null;
let refreshInProgress = false;
let statusInProgress = false;
let pollInProgress = false;
let lastDataRead: string | null = null;
let toastTimer: ReturnType<typeof setTimeout>;

el('#app').innerHTML = `
  <header class="site-header"><div class="shell header-inner">
    <a class="brand" href="./" aria-label="Kipu, inicio"><span class="brand-mark">k<span></span></span><span>kipu<span class="brand-caption">Inteligencia para conectar</span></span></a>
    <nav aria-label="Principal"><a class="nav-active" href="#resultados">Explorar oportunidades</a><button id="saved-open" class="nav-button">${icon('bookmark')} Mis búsquedas</button><button id="help-open" class="nav-button">Cómo funciona <span aria-hidden="true">↗</span></button></nav>
  </div></header>
  <main>
    <section class="hero"><div class="shell hero-inner"><div>
      <p class="eyebrow"><span class="tiny-line"></span> CONTRATACIONES PÚBLICAS · PERÚ</p>
      <h1>La información correcta.<br><em>Tu próxima oportunidad.</em></h1>
      <p class="hero-copy">Encuentra convocatorias de equipos, dispositivos e insumos médicos.<br class="desktop-only"> Explora, identifica coincidencias y revisa cada oportunidad en SEACE.</p>
    </div><div class="hero-aside"><span class="hero-symbol" aria-hidden="true">↗</span><div class="hero-note"><span class="status-dot"></span> Una mirada a las compras públicas<span>Datos abiertos. Decisiones informadas.</span></div></div></div></section>
    <div class="shell workspace">
      <div class="section-bar"><div class="tabs" role="group" aria-label="Conjunto de datos"><button class="tab active" data-dataset="recientes" aria-pressed="true">Convocatorias recientes</button><button class="tab" data-dataset="historico" aria-pressed="false">Explorar histórico</button></div><button id="coverage-open" class="status-link"><span id="worker-dot" class="status-dot neutral"></span><span id="worker-label">Consultando estado</span> <span aria-hidden="true">↗</span></button></div>
      <div class="workspace-grid">
        <aside class="filter-panel"><form id="filters"><div class="panel-heading"><h2>Afina tu búsqueda</h2><button type="reset" class="text-button">Limpiar</button></div>
          <label for="q">Producto o palabra clave</label><div class="search-input">${icon('search')}<input id="q" name="q" type="search" maxlength="200" placeholder="Ej. tomógrafo, jeringa…" autocomplete="off"></div>
          <button type="button" id="filters-toggle" class="advanced-toggle" aria-expanded="false">Más filtros <span aria-hidden="true">＋</span></button>
          <label for="entity">Entidad convocante</label><input id="entity" name="entity" maxlength="200" placeholder="Nombre de la entidad">
          <div class="field-pair"><div><label for="year">Año de convocatoria</label><select id="year" name="year"><option value="">Todos los años</option></select></div></div>
          <label for="object">Objeto de contratación</label><select id="object" name="object"><option value="">Todos los objetos</option><option>Bien</option><option>Servicio</option><option>Obra</option><option>Consultoría de Obra</option></select>
          <label for="medical">Tipo de coincidencia</label><select id="medical" name="medical"><option value="match">Coincidencia médica</option><option value="review">Por revisar</option><option value="all">Todas las publicaciones</option></select>
          <label for="category">Categoría del producto</label><select id="category" name="category"><option value="">Todas las categorías</option></select>
          <fieldset class="date-fields"><legend>Fecha de publicación</legend><div><label for="date_from">Desde</label><input id="date_from" name="date_from" type="date"></div><div><label for="date_to">Hasta</label><input id="date_to" name="date_to" type="date"></div></fieldset>
          <p id="filter-error" class="field-error" role="alert" hidden></p><button class="button primary full" type="submit">${icon('search')} Buscar oportunidades</button>
          <button class="button subtle full" id="save-search" type="button">${icon('bookmark')} Guardar búsqueda</button>
        </form><div class="filter-footnote"><span class="mini-label">UN DATO ÚTIL</span><p>Las palabras clave ayudan a encontrar coincidencias. Revisa el detalle para confirmar que el producto corresponde a tu empresa.</p></div></aside>
        <div class="content-column" id="resultados" tabindex="-1">
          <div class="content-heading"><div><p class="eyebrow dark">EXPLORA CON CRITERIO</p><h2 id="dataset-title">Oportunidades recientes</h2></div><button id="refresh" class="button outline small">${icon('refresh')} Actualizar</button></div>
          <p id="dataset-note" class="context-note">Publicaciones detectadas en el buscador de SEACE. Su vigencia se confirma en la fuente oficial.</p>
          <p id="data-sync" class="context-note" role="status" hidden></p>
          <div id="error-state" class="error-state" role="alert" hidden></div>
          <div id="loading" class="loading" role="status"><span class="spinner"></span><span>Consultando oportunidades…<br><span class="quiet">El primer acceso puede tardar cerca de un minuto.</span></span></div>
          <div id="dashboard" hidden>
            <section class="metrics" aria-label="Resumen de la selección" id="metrics"></section>
            <div class="insight-grid"><section class="card chart-card"><div class="card-title"><h3 id="chart-title">Actividad por mes</h3><span class="mini-label">SELECCIÓN ACTUAL</span></div><div id="chart"></div></section><section class="card entities-card"><div class="card-title"><h3>Entidades con más publicaciones</h3></div><ol id="top-entities"></ol></section></div>
            <section class="card results-card" aria-labelledby="results-title"><div class="results-toolbar"><div><h3 id="results-title">Convocatorias encontradas</h3><p id="results-count"></p></div><div class="result-actions"><label class="sr-only" for="sort">Ordenar resultados</label><select id="sort"><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option></select><button id="export" class="button outline small">${icon('download')} Exportar CSV</button></div></div>
              <div class="table-scroll"><table><caption class="sr-only">Resultados de la búsqueda de contrataciones públicas</caption><thead><tr><th>Convocatoria / entidad</th><th>Producto o servicio</th><th>Publicación</th><th>Monto informado</th><th><span class="sr-only">Ver detalle</span></th></tr></thead><tbody id="records"></tbody></table></div>
              <div id="empty" class="empty-state" hidden><span class="empty-symbol">${icon('search')}</span><h3>No encontramos coincidencias</h3><p>Prueba otra palabra, amplía las fechas o selecciona todos los tipos de coincidencia.</p></div>
              <div class="pagination"><span id="page-info"></span><div><button id="previous" class="button outline small" aria-label="Página anterior">← Anterior</button><button id="next" class="button outline small" aria-label="Página siguiente">Siguiente →</button></div></div>
            </section>
          </div>
          <div class="email-strip"><span class="email-icon">${icon('mail')}</span><div><h3>Las oportunidades también pueden llegar a tu correo</h3><p>Avisos de nuevas coincidencias médicas del diccionario, con un enlace al detalle.</p></div><button id="alerts-info" class="text-button">Ver cómo funciona ↗</button></div>
        </div>
      </div>
      <footer><span class="footer-brand">kipu<span>Una conexión con nuevas oportunidades.</span></span><p>Fuente: SEACE / OECE · Datos públicos de Perú<br>Las coincidencias no sustituyen la revisión de la convocatoria oficial.</p><button id="footer-coverage" class="text-button">Fuentes y cobertura ↗</button></footer>
    </div>
  </main>
  <dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><span class="mini-label">KIPU · OBSERVATORIO</span><button id="dialog-close" class="icon-button" aria-label="Cerrar">${icon('close')}</button></div><div id="dialog-body"></div></dialog>
  <div id="toast" class="toast" role="status" hidden></div>`;

function toast(message: string) {
  el('#toast').textContent = message; el('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el('#toast').hidden = true; }, 4000);
}
function showDialog(html: string) {
  el('#dialog-body').innerHTML = html;
  const dialog = el<HTMLDialogElement>('#dialog');
  if (!dialog.open) dialog.showModal();
}
el('#dialog-close').onclick = () => el<HTMLDialogElement>('#dialog').close();
el<HTMLDialogElement>('#dialog').addEventListener('click', event => { if (event.target === event.currentTarget) el<HTMLDialogElement>('#dialog').close(); });

function renderSummary(summary: Summary) {
  const metrics = [
    ['Resultados en la selección', number(summary.total), summary.unit],
    ['Entidades convocantes', number(summary.entities), 'en los resultados filtrados'],
    ['Con coincidencia médica', number(summary.medical), `${number(summary.review)} con términos por revisar`],
  ];
  el('#metrics').innerHTML = metrics.map(([label, value, hint], index) => `<article class="metric ${index === 0 ? 'featured' : ''}"><p>${label}</p><strong>${value}</strong><span>${hint}</span></article>`).join('');
  el('#chart-title').textContent = filters.dataset === 'historico' ? 'Procesos por año de convocatoria' : 'Publicaciones por mes';
  const max = Math.max(...summary.series.map(item => item.total), 1);
  el('#chart').innerHTML = summary.series.length ? `<div class="bar-chart" role="img" aria-label="${e(summary.series.map(item => `${item.label || 'Sin fecha'}: ${item.total}`).join('; '))}">${summary.series.map(item => `<div class="bar-column" title="${e(item.label || 'Sin fecha')}: ${number(item.total)}"><span class="bar-value">${number(item.total)}</span><div class="bar-track"><div class="bar" style="height:${Math.max(item.total / max * 100, 3)}%"></div></div><span class="bar-label">${e(item.label || 'S/f')}</span></div>`).join('')}</div>` : '<p class="quiet">Sin datos para representar.</p>';
  el('#top-entities').innerHTML = summary.top_entities.length ? summary.top_entities.map((item, index) => `<li><span class="entity-rank">0${index + 1}</span><span>${e(item.entity)}</span><strong>${number(item.total)}</strong></li>`).join('') : '<li class="quiet">Sin entidades en esta selección.</li>';
}
function renderPage(page: Page) {
  currentPage = page;
  el('#results-count').textContent = `${number(page.total)} ${page.unit} · ${filters.q ? `“${filters.q}”` : 'Filtros seleccionados'}`;
  el('#records').innerHTML = page.items.map(record => `<tr><td><button class="record-link" data-record="${e(record.id)}">${e(record.nomenclature)}</button><span class="entity-name">${e(record.entity)}</span><span class="object-label">${e(record.object)} · ${record.year || 'Año no definido'}</span></td><td><p class="description">${e(record.description)}</p><span class="badge ${record.medical_mask ? 'match' : record.review_mask ? 'review' : 'neutral'}">${record.medical_mask ? 'Coincidencia médica' : record.review_mask ? 'Por revisar' : 'Sin coincidencia médica'}</span></td><td class="date-cell">${e(dateTime(record.published_at))}</td><td class="amount-cell">${e(money(record.amount, record.currency))}<span>${record.amount ? e(record.currency) : 'Dato de la fuente'}</span></td><td><button class="detail-button" data-record="${e(record.id)}" aria-label="Ver detalle de ${e(record.nomenclature)}">${icon('arrow')}</button></td></tr>`).join('');
  el('#empty').hidden = page.total !== 0;
  const totalPages = Math.max(Math.ceil(page.total / page.page_size), 1);
  el('#page-info').textContent = page.total ? `${number((page.page - 1) * page.page_size + 1)}–${number(Math.min(page.page * page.page_size, page.total))} de ${number(page.total)}` : '0 resultados';
  el<HTMLButtonElement>('#previous').disabled = page.page <= 1;
  el<HTMLButtonElement>('#next').disabled = page.page >= totalPages || page.page >= 10000;
  el<HTMLButtonElement>('#export').disabled = !page.total;
  el('#records').querySelectorAll<HTMLButtonElement>('[data-record]').forEach(button => { button.onclick = () => void openRecord(button.dataset.record!); });
}
async function refresh(background = false) {
  if (background && (refreshInProgress || !currentPage || filters.dataset !== 'recientes' || filters.page !== 1 || el<HTMLDialogElement>('#dialog').open)) return;
  el('#filter-error').hidden = true;
  const error = validateDates(filters);
  if (error) { el('#filter-error').textContent = error; el('#filter-error').hidden = false; return; }
  request?.abort();
  const activeRequest = new AbortController();
  request = activeRequest;
  const signal = activeRequest.signal;
  refreshInProgress = true;
  if (!background) {
    el('#error-state').hidden = true; el('#loading').hidden = false; el('#dashboard').hidden = true;
    el<HTMLButtonElement>('#refresh').disabled = true;
  }
  try {
    const params = queryParams(filters);
    const [page, summary] = await Promise.all([api<Page>(`/api/v1/records?${params}`, signal), api<Summary>(`/api/v1/summary?${params}`, signal)]);
    if (signal.aborted) return;
    renderSummary(summary); renderPage(page); el('#dashboard').hidden = false;
    el('#error-state').hidden = true;
    lastDataRead = new Date().toISOString();
    el('#data-sync').textContent = `Datos consultados: ${dateTime(lastDataRead)}${filters.dataset === 'recientes' && filters.page === 1 ? ' · Actualización automática cada minuto.' : ''}`;
    el('#data-sync').hidden = false;
  } catch (error) {
    if (signal.aborted) return;
    if (background) {
      el('#data-sync').textContent = `No pudimos actualizar ahora. Conservamos los resultados${lastDataRead ? ` de ${dateTime(lastDataRead)}` : ''}.`;
      el('#data-sync').hidden = false;
      return;
    }
    el('#error-state').innerHTML = `<h3>${API_BASE ? 'No pudimos cargar la información' : 'Conexión con datos en preparación'}</h3><p>${e(error instanceof Error ? error.message : 'Error inesperado.')}</p>${API_BASE ? '<button class="button outline" id="retry">Volver a intentar</button>' : '<p>Puedes conocer la interfaz mientras se completa la puesta en marcha. No se muestran datos simulados.</p>'}`;
    el('#error-state').hidden = false;
    if (API_BASE) el('#retry').onclick = () => void refresh();
  } finally {
    if (request === activeRequest) {
      refreshInProgress = false;
      el('#loading').hidden = true;
      el<HTMLButtonElement>('#refresh').disabled = false;
    }
  }
}
function syncForm() {
  for (const [key, value] of Object.entries(filters)) {
    const field = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#filters [name="${key}"]`);
    if (field) field.value = String(value);
  }
  el<HTMLSelectElement>('#sort').value = filters.sort;
  document.querySelectorAll<HTMLButtonElement>('[data-dataset]').forEach(button => {
    const active = button.dataset.dataset === filters.dataset;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  el('#dataset-title').textContent = filters.dataset === 'recientes' ? 'Oportunidades recientes' : 'Una mirada al histórico';
  setDatasetNote();
  el('#results-title').textContent = filters.dataset === 'recientes' ? 'Convocatorias encontradas' : 'Procesos encontrados';
  el<HTMLSelectElement>('#object').disabled = filters.dataset === 'historico';
}
function setDatasetNote() {
  const history = metadata?.coverage.historico;
  el('#dataset-note').textContent = filters.dataset === 'recientes'
    ? 'Publicaciones detectadas en el buscador de SEACE. Su vigencia se confirma en la fuente oficial.'
    : history && !history.complete
      ? 'Importación parcial del histórico de bienes. Los resultados corresponden a lo cargado; no representan todos los procesos del archivo de origen.'
      : 'Procesos consolidados de bienes. La cobertura corresponde al archivo importado; no equivale al conteo de publicaciones recientes.';
}
el<HTMLFormElement>('#filters').onsubmit = event => {
  event.preventDefault();
  const data = new FormData(el<HTMLFormElement>('#filters'));
  filters = { ...filters, ...Object.fromEntries(data), page: 1 } as Filters;
  void refresh();
};
el('#filters-toggle').onclick = () => {
  const expanded = el('.filter-panel').classList.toggle('show-advanced');
  el('#filters-toggle').setAttribute('aria-expanded', String(expanded));
  el('#filters-toggle').innerHTML = `${expanded ? 'Menos filtros' : 'Más filtros'} <span aria-hidden="true">${expanded ? '−' : '＋'}</span>`;
};
el<HTMLFormElement>('#filters').onreset = () => { filters = { ...DEFAULT_FILTERS, dataset: filters.dataset, object: filters.dataset === 'historico' ? 'Bien' : '' }; setTimeout(() => { syncForm(); void refresh(); }, 0); };
document.querySelectorAll<HTMLButtonElement>('[data-dataset]').forEach(button => { button.onclick = () => {
  filters = { ...filters, dataset: button.dataset.dataset as Filters['dataset'], page: 1, object: button.dataset.dataset === 'historico' ? 'Bien' : '' };
  syncForm(); void refresh();
}; });
el<HTMLSelectElement>('#sort').onchange = event => { filters.sort = (event.target as HTMLSelectElement).value as Filters['sort']; filters.page = 1; void refresh(); };
el('#previous').onclick = () => { filters.page--; void refresh(); };
el('#next').onclick = () => { filters.page++; void refresh(); };
el('#refresh').onclick = () => { void refresh(); void loadStatus(); };
el('#export').onclick = async () => {
  const button = el<HTMLButtonElement>('#export'); button.disabled = true;
  try { await downloadCsv(filters); toast('La descarga está lista.'); }
  catch (error) { toast(error instanceof Error ? error.message : 'No se pudo exportar.'); }
  finally { button.disabled = !currentPage?.total; }
};

async function openRecord(ident: string) {
  showDialog('<h2 id="dialog-title">Detalle de la convocatoria</h2><p class="quiet">Cargando información…</p>');
  try {
    const record = await api<Procurement>(`/api/v1/records/${encodeURIComponent(ident)}`);
    const share = new URL(location.href); share.search = ''; share.hash = ''; share.searchParams.set('registro', record.id);
    showDialog(`<span class="badge ${record.medical_mask ? 'match' : 'review'}">${record.medical_mask ? 'Coincidencia médica' : record.review_mask ? 'Por revisar' : 'Sin coincidencia médica'}</span><h2 id="dialog-title">${e(record.nomenclature)}</h2><p class="detail-entity">${e(record.entity)}</p><p class="detail-description">${e(record.description)}</p><dl class="detail-grid"><div><dt>Publicado en SEACE</dt><dd>${e(dateTime(record.published_at))}</dd></div><div><dt>Monto informado</dt><dd>${e(money(record.amount, record.currency))}</dd></div><div><dt>Objeto · año de convocatoria</dt><dd>${e(record.object)} · ${record.year || 'Sin año'}</dd></div><div><dt>Conjunto de datos</dt><dd>${record.dataset === 'historico' ? 'Proceso consolidado histórico' : 'Publicación reciente'}</dd></div></dl><h3>Palabras y categorías identificadas</h3><div class="keywords">${record.evidence.length ? record.evidence.map(item => `<span>${e(item)}</span>`).join('') : '<p class="quiet">Sin coincidencias en el diccionario.</p>'}</div><div class="detail-note">Confirma las especificaciones y el cronograma en SEACE. Si el portal abre el buscador, usa la nomenclatura <strong>${e(record.nomenclature)}</strong> para ubicar el procedimiento.</div><div class="dialog-actions"><a class="button primary" href="${e(safeSource(record.source_url))}" target="_blank" rel="noopener noreferrer">Consultar en SEACE ${icon('external')}</a><button class="button outline" id="copy-record">Copiar enlace</button><button class="text-button" id="copy-name">Copiar nomenclatura</button></div>`);
    el('#copy-record').onclick = () => void copy(share.href);
    el('#copy-name').onclick = () => void copy(record.nomenclature);
  } catch (error) { showDialog(`<h2 id="dialog-title">No se pudo abrir el detalle</h2><p>${e(error instanceof Error ? error.message : 'Intenta nuevamente.')}</p>`); }
}
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); toast('Copiado al portapapeles.'); }
  catch { toast('El navegador no permite copiar automáticamente. Selecciona el texto para copiarlo.'); }
}
el('#save-search').onclick = () => {
  const saved = readSaved();
  const data = new FormData(el<HTMLFormElement>('#filters'));
  const selection = { ...filters, ...Object.fromEntries(data), page: 1 } as Filters;
  if (validateDates(selection)) { toast(validateDates(selection)!); return; }
  try {
    const signature = JSON.stringify(selection);
    localStorage.setItem('kipu.saved.v1', JSON.stringify([selection, ...saved.filter(item => JSON.stringify(item) !== signature)].slice(0, 5)));
    toast('Búsqueda guardada en este navegador.');
  } catch { toast('No pudimos guardar la búsqueda en este navegador.'); }
};
el('#saved-open').onclick = () => {
  const saved = readSaved();
  showDialog(`<h2 id="dialog-title">Mis búsquedas</h2><p class="quiet">Hasta cinco búsquedas guardadas en este navegador. Los avisos por correo se configuran por separado.</p><div class="saved-list">${saved.length ? saved.map((item, index) => `<div><button class="saved-search" data-saved="${index}"><strong>${e(item.q || item.entity || 'Todas las oportunidades')}</strong><span>${item.dataset === 'recientes' ? 'Recientes' : 'Histórico'} · ${e(item.year || 'Todos los años')} · ${item.medical === 'match' ? 'Coincidencia médica' : item.medical === 'review' ? 'Por revisar' : 'Todas'}</span></button><button class="text-button" data-delete="${index}" aria-label="Eliminar búsqueda ${index + 1}">Eliminar</button></div>`).join('') : '<div class="empty-state"><h3>Aquí aparecerán tus búsquedas</h3><p>Elige tus filtros y pulsa «Guardar búsqueda».</p></div>'}</div>`);
  document.querySelectorAll<HTMLButtonElement>('[data-saved]').forEach(button => { button.onclick = () => { filters = { ...DEFAULT_FILTERS, ...saved[Number(button.dataset.saved)] }; syncForm(); el<HTMLDialogElement>('#dialog').close(); void refresh(); }; });
  document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(button => { button.onclick = () => { try { localStorage.setItem('kipu.saved.v1', JSON.stringify(saved.filter((_, i) => i !== Number(button.dataset.delete)))); el('#saved-open').click(); } catch { toast('No se pudo eliminar.'); } }; });
};
const alertsInfo = () => showDialog(`<h2 id="dialog-title">Alertas de publicaciones recientes</h2><p>Kipu avisa a los destinatarios registrados cuando detecta una convocatoria con «Coincidencia médica» y hasta cinco minutos desde su publicación en SEACE.</p><ol class="steps"><li><strong>Coincidencia médica reciente.</strong><span>Se utiliza el diccionario y el criterio de la lista principal. Las publicaciones que quedan únicamente «por revisar» no generan correos.</span></li><li><strong>Recibe el aviso.</strong><span>El correo incluye la entidad, la descripción, las coincidencias del diccionario y un enlace al detalle.</span></li><li><strong>Revisa la oportunidad.</strong><span>Confirma las especificaciones y los plazos en SEACE antes de participar.</span></li></ol><div class="detail-note">Todos los destinatarios reciben las mismas alertas. No se aplican filtros por empresa ni palabras clave individuales. TI administra las altas y bajas. Si una publicación supera cinco minutos antes del envío, se conserva en Kipu sin correo, aunque se haya recuperado después de una falla. El histórico y la base inicial tampoco generan avisos.</div>`);
el('#alerts-info').onclick = alertsInfo;
el('#help-open').onclick = () => showDialog(`<h2 id="dialog-title">Encuentra. Revisa. Decide.</h2><ol class="steps"><li><strong>Busca por producto o entidad.</strong><span>Combina palabras, categoría y fechas para afinar los resultados.</span></li><li><strong>Abre el detalle de una convocatoria.</strong><span>Verás el monto informado y las coincidencias del diccionario médico.</span></li><li><strong>Confirma la oportunidad en SEACE.</strong><span>La empresa valida que vende el producto y que el proceso permite participar.</span></li></ol><p class="quiet">«Recientes» muestra publicaciones detectadas por el seguimiento. «Histórico» muestra procesos consolidados del archivo importado. Los conteos tienen unidades distintas.</p>`);

let lastStatus: CollectorStatus | null = null;
async function loadStatus() {
  if (statusInProgress) return;
  statusInProgress = true;
  try {
    lastStatus = await api<CollectorStatus>('/api/v1/collector/status');
    const errors = Object.values(lastStatus.objects).some(state => !!state.ultimo_error);
    el('#worker-dot').className = `status-dot ${lastStatus.worker_online && !errors ? '' : 'neutral'}`;
    el('#worker-label').textContent = !lastStatus.worker_online ? 'Seguimiento sin actividad reciente' : errors ? 'Seguimiento con incidencias' : lastStatus.runtime.running ? 'Revisando SEACE' : `Seguimiento activo · cada ${Math.round(lastStatus.interval_seconds / 60)} min`;
    el('#coverage-open').title = lastStatus.note;
  } catch { el('#worker-label').textContent = 'Estado no disponible'; el('#worker-dot').className = 'status-dot neutral'; }
  finally { statusInProgress = false; }
}
function coverageDialog() {
  const history = metadata?.coverage.historico;
  const recent = metadata?.coverage.recientes;
  showDialog(`<h2 id="dialog-title">Fuentes y cobertura</h2><h3>Convocatorias recientes</h3><p>${e(recent?.note || 'Todavía no hay una cobertura reciente registrada en esta instalación.')}</p><div class="coverage-list">${lastStatus ? Object.entries(lastStatus.objects).map(([object, state]) => `<div><strong>${e(object)}</strong><span>Última lectura correcta: ${e(dateTime(state.ultima_exitosa))}</span><span>Período revisado: ${e(state.desde_revisado || '—')} a ${e(state.hasta_revisado || '—')}</span>${state.ultimo_error ? `<p class="field-error">${e(state.ultimo_error)}</p>` : ''}${state.periodo_sin_recuperar ? `<p class="field-error">Período sin recuperar: ${e(state.periodo_sin_recuperar.desde)} a ${e(state.periodo_sin_recuperar.hasta)}</p>` : ''}</div>`).join('') : '<p class="quiet">Estado del recolector no disponible.</p>'}</div><h3>Histórico de procesos consolidados</h3><p>${history ? `${number(history.imported || 0)} filas procesadas en la última importación. ${history.complete ? 'Importación completa del archivo de origen.' : 'Importación parcial; el conteo no representa todo el archivo de origen.'}` : 'Aún no se ha importado el histórico en esta instalación.'}</p>${history?.cutoff ? `<p>Corte de la fuente: ${e(dateTime(history.cutoff))}</p>` : ''}<p>${e(history?.note || '')}</p><div class="detail-note">No sumar los conteos del histórico y los recientes. La detección periódica puede tener demoras o interrupciones; publicar no significa que el proceso siga abierto.</div><div class="dialog-actions"><a class="button outline" href="https://www.gob.pe/oece" target="_blank" rel="noopener noreferrer">OECE ${icon('external')}</a><a class="text-button" href="https://contratacionesabiertas.oece.gob.pe/descargas" target="_blank" rel="noopener noreferrer">Datos abiertos oficiales ↗</a></div>`);
}
el('#coverage-open').onclick = coverageDialog;
el('#footer-coverage').onclick = coverageDialog;

async function init() {
  if (configurationError()) { el('#worker-label').textContent = 'Pendiente de conexión'; }
  await Promise.allSettled([
    refresh(), loadStatus(),
    (async () => {
      metadata = await api<Metadata>('/api/v1/metadata');
      el('#year').innerHTML = '<option value="">Todos los años</option>' + metadata.years.map(year => `<option>${year}</option>`).join('');
      el('#category').innerHTML = '<option value="">Todas las categorías</option>' + metadata.dictionary.categorias.map((category, index) => `<option value="${index}">${e(category.nombre)}</option>`).join('');
      el<HTMLSelectElement>('#year').value = filters.year;
      el<HTMLSelectElement>('#category').value = filters.category;
      setDatasetNote();
    })(),
  ]);
  const ident = new URLSearchParams(location.search).get('registro');
  if (ident && /^[a-zA-Z0-9_:-]{1,100}$/.test(ident)) await openRecord(ident);
}
void init();
async function pollUpdates() {
  if (document.hidden || configurationError() || pollInProgress) return;
  pollInProgress = true;
  try {
    await loadStatus();
    if (!document.hidden) await refresh(true);
  } finally { pollInProgress = false; }
}
setInterval(() => { void pollUpdates(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void pollUpdates(); });
window.addEventListener('online', () => { void pollUpdates(); });
