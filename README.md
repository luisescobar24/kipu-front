# Kipu Front

Página de consulta de oportunidades médicas de SEACE. TypeScript estricto + Vite, HTML semántico y CSS adaptable a escritorio y móvil. Consulta el proyecto separado `C:\Users\luise\Desktop\Kipu Back` por API HTTP.

Incluye búsqueda por texto/entidad, año, objeto, categoría y fecha; separación entre publicaciones recientes e histórico; indicadores; paginación; detalle con enlace oficial; exportación CSV y cinco búsquedas guardadas en el navegador. El enlace `?registro=IDENTIFICADOR` permite abrir desde un correo el detalle de una publicación. Los avisos por correo se configuran en el backend mediante TI.

La página no contiene la base de datos ni el HTML histórico de 206 MB. Solo descarga resultados y resúmenes de la selección actual. No presenta datos simulados si la API falta: muestra el error de configuración o conexión.

## Ejecutar en local

Requisito recomendado: Node.js **24 LTS** y el backend funcionando en el puerto 8000.

```powershell
cd 'C:\Users\luise\Desktop\Kipu Front'
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Abrir <http://127.0.0.1:5173/>. Editar `VITE_API_BASE_URL` en `.env.local` si el backend usa otra dirección. Es un valor público; jamás guardar contraseñas de PostgreSQL, claves Brevo o `service_role` de Supabase aquí. En esta entrega se dejó `.env.local` apuntando a `http://127.0.0.1:8000`, excluido de Git.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
# Navegación automática en escritorio y móvil:
npx.cmd playwright install chromium
npm.cmd run test:e2e
# Windows: puede usarse Edge sin descargar otro navegador.
$env:PW_CHANNEL='msedge'
npm.cmd run test:e2e
```

`dist/` es el resultado listo para hosting estático. `.venv` del backend y `node_modules` son herramientas locales; no se publican. `package-lock.json` fija las versiones y sí debe subirse. El archivo de variables se lee **al compilar**: cambiar la URL requiere una nueva compilación.

## Publicar en GitHub Pages

1. Subir **el contenido de esta carpeta** a un repositorio `kipu-front`. Con GitHub Free, usar un repositorio público para Pages. El backend va a otro repositorio y a un servidor con Python/Docker.
2. Desplegar primero la API con HTTPS. En GitHub, ir a **Settings → Secrets and variables → Actions → Variables** y crear `API_BASE_URL`, por ejemplo `https://api.tudominio.com`. Es una variable, no un secreto, porque el navegador necesita conocerla.
3. En **Settings → Pages → Build and deployment → Source**, seleccionar **GitHub Actions**.
4. El workflow `.github/workflows/pages.yml` ejecuta tests y compila al subir a `main` o ejecutarlo manualmente. Con `API_BASE_URL` configurada, también comprueba HTTPS y publica. Mientras falte esa variable, deja un aviso y omite la publicación. Las PR solo validan.
5. En el backend configurar `CORS_ORIGINS=["https://TU_USUARIO.github.io"]` y `FRONTEND_URL=https://TU_USUARIO.github.io/kipu-front/`. El primero no lleva la ruta; el segundo sí.
6. Verificar en la URL final: búsqueda, filtros, detalle, exportación y un enlace con `?registro=...`. Revisar «Fuentes y cobertura» antes de usar los conteos.

```powershell
# Después del primer push, ambos proyectos tienen su remoto origin en GitHub.
git remote -v
git add .
git commit -m "feat: describir el cambio realizado"
git push
```

Si partes de un ZIP sin historial, ejecutar primero `git init -b main`, crear el commit inicial y añadir el remoto del repositorio vacío con `git remote add origin URL_DEL_REPOSITORIO`. Usar una clonación para trabajar con un repositorio que ya tiene historial. No añadir tokens a la URL. Git ignora `.env*` privados, dependencias, reportes de pruebas y compilados. Antes de cada commit, revisar `git status`.

`base: './'` produce rutas relativas y no hay un router que dependa de reescribir URLs: funciona tanto en `usuario.github.io/kipu-front/` como en un dominio raíz. Los enlaces de detalle usan query strings sobre `index.html`. No se necesita una página 404 que simule rutas del backend.

GitHub Pages ejecuta HTML/CSS/JavaScript estáticos; no ejecuta Python ni consulta SEACE en segundo plano. Esta entrega es adecuada para la demostración del proyecto. Revisar los [límites de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) antes de evolucionarlo a una oferta comercial. Para Cloudflare Pages, usar `npm run build`, salida `dist` y la misma variable `VITE_API_BASE_URL`.

## Docker opcional para el frontend

GitHub Pages no usa Docker. Esta imagen permite servir el mismo frontend en otro servidor:

```powershell
docker build --build-arg VITE_API_BASE_URL=https://api.tudominio.com -t kipu-front .
docker run --rm -p 8080:8080 kipu-front
```

Nginx sirve solo archivos estáticos como usuario sin privilegios, puerto 8080. Para publicar con un dominio, habilitar HTTPS en el proveedor o proxy.

## Organización y mantenimiento

- `src/main.ts`: vistas, filtros y coordinación de consultas. Todas las inserciones de texto externo se escapan.
- `src/api.ts`: conexión, cancelación, límites de espera y errores de API.
- `src/types.ts`: contrato explícito de respuesta.
- `src/format.ts`: fechas de Perú, importes, seguridad de enlaces y búsquedas locales.
- `src/styles.css` y `readability.css`: diseño adaptable y ajustes de lectura.
- `tests/`: reglas de presentación; `e2e/`: flujos en navegador con fixtures exclusivas de pruebas.
- `.github/`: CI, despliegue y plantilla de revisión.

Aplicar ramas pequeñas y pull requests con problema, cambio y pruebas. Para una persona a 10 h/semana, mantener el Excel de sprints y evitar introducir un framework nuevo sin una necesidad concreta. Una historia termina con flujo funcional, estados de error y vacío, revisión móvil y documentación de configuración.

Limitaciones: las búsquedas guardadas pertenecen a este navegador, sin cuenta ni sincronización. Los avisos de correo son administrados por TI; no hay un alta pública de destinatarios. Las coincidencias son textuales, no una recomendación de participación. El histórico importado puede ser parcial y no se suma a publicaciones recientes.

Documentación técnica de referencia: [Vite / GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages). Auditoría de dependencias: [DEPENDENCIAS.md](docs/DEPENDENCIAS.md). Validación realizada: [VALIDACION.md](docs/VALIDACION.md).
