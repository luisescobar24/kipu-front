# Validación de la entrega

Fecha: 17 de noviembre de 2026.

| Comprobación | Resultado |
|---|---|
| TypeScript estricto y compilación Vite | Aprobado |
| Pruebas unitarias de presentación/seguridad | **5 aprobadas** |
| Flujos automáticos con Playwright, escritorio y móvil | **6 aprobados** |
| Navegación contra FastAPI y PostgreSQL locales reales | Aprobada: filtros, detalle, CSV y cobertura |
| Compilación con la API HTTPS de Render y datos de Supabase | Aprobada: 1.829 publicaciones y 3 resultados para `tomografo` |
| Origen de Pages contra la API pública | CORS, detalle, CSV, enlace histórico y móvil aprobados |
| Archivos compilados servidos bajo `/kipu-front/` | Aprobado, equivalente a una ruta de repositorio de Pages |
| Enlace `?registro=...` de publicación e histórico | Aprobado |
| Vista de 390 px y revisión visual de escritorio | Sin desbordamiento horizontal |
| Errores JavaScript/HTTP del recorrido real | Ninguno |
| Tamaño total de `dist`, sin compresión | **49.570 bytes**, aproximadamente 50 KB |
| Auditoría npm sin dependencias de desarrollo | Sin avisos |
| Auditoría npm completa | 5 avisos altos relacionados con picomatch en herramientas de desarrollo; ver [DEPENDENCIAS.md](DEPENDENCIAS.md) |

Las fixtures de Playwright solo existen en `e2e/` y no entran al sitio compilado. La comprobación adicional real usó primero PostgreSQL local y después Supabase mediante <https://kipu-back.onrender.com>. Para esta última revisión se sirvieron los archivos de `dist` bajo el origen previsto de Pages en un navegador de prueba; las respuestas de la API fueron reales, sin sustituir datos. Se comprobaron filtros, detalle, CSV, histórico parcial, enlace de detalle y móvil, sin errores JavaScript ni HTTP.

Los repositorios ya pertenecen a `luisescobar24`. La API está desplegada en Render con Docker y plan Free; se verificaron `/health/ready`, los datos y CORS para `https://luisescobar24.github.io`. Se guardó `API_BASE_URL=https://kipu-back.onrender.com` en el repositorio del frontend. El workflow de Pages debe terminar correctamente para actualizar la página pública: esta revisión del compilado no sustituye la comprobación de la versión publicada. Consultar el último [workflow de Pages](https://github.com/luisescobar24/kipu-front/actions/workflows/pages.yml).

Las 5 pruebas unitarias y los 6 flujos de Playwright se repitieron después de ampliar a 90 segundos la espera de la API y añadir el aviso del primer acceso. El recolector periódico y el envío real de correos se validan por separado; no se activaron con el despliegue de la API.
