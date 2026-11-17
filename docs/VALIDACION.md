# Validación de la entrega

Fecha: 17 de noviembre de 2026.

| Comprobación | Resultado |
|---|---|
| TypeScript estricto y compilación Vite | Aprobado |
| Pruebas unitarias de presentación/seguridad | **5 aprobadas** |
| Flujos automáticos con Playwright, escritorio y móvil | **6 aprobados** |
| Navegación contra FastAPI y PostgreSQL locales reales | Aprobada: filtros, detalle, CSV y cobertura |
| Archivos compilados servidos bajo `/kipu-front/` | Aprobado, equivalente a una ruta de repositorio de Pages |
| Enlace `?registro=...` de publicación e histórico | Aprobado |
| Vista de 390 px y revisión visual de escritorio | Sin desbordamiento horizontal |
| Errores JavaScript/HTTP del recorrido real | Ninguno |
| Tamaño total de `dist`, sin compresión | **49.273 bytes**, aproximadamente 49 KB |
| Auditoría npm sin dependencias de desarrollo | Sin avisos |
| Auditoría npm completa | 5 avisos altos relacionados con picomatch en herramientas de desarrollo; ver [DEPENDENCIAS.md](DEPENDENCIAS.md) |

Las fixtures de Playwright solo existen en `e2e/` y no entran al sitio compilado. La comprobación adicional real usó una muestra de datos originales importada a una base PostgreSQL local, con el histórico identificado como parcial.

La revisión local precede al primer push a GitHub. Subir el repositorio no publica la página mientras falte `API_BASE_URL`. Docker se preparó, pero no se pudo construir aquí porque el motor/CLI no está disponible. La conexión real de Supabase, el backend HTTPS y el correo requieren configurar las cuentas de destino. Consultar GitHub Actions para conocer el resultado remoto. La vista local de esta sesión no sustituye ese despliegue.
