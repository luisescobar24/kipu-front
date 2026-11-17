# Dependencias y revisión

Verificado el 17 de noviembre de 2026. Las dependencias de este proyecto son de desarrollo: Vite compila, TypeScript comprueba y Vitest/Playwright prueban. El resultado `dist` funciona sin Node, sin `node_modules` y sin dependencias de ejecución npm.

La auditoría completa `npm audit` detectó **5 avisos altos relacionados con una misma vulnerabilidad de picomatch**, utilizada transitivamente por herramientas de búsqueda de archivos de Vite/Vitest. El [aviso oficial GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) afecta a patrones extglob de entrada que pueden bloquear Node. En la fecha de la revisión no hay versión corregida publicada; no se aplicó una degradación automática de Vite/Vitest.

El código de la página no usa picomatch para buscar publicaciones ni recibe patrones de archivos del usuario. Las búsquedas viajan a PostgreSQL a través de la API. El servidor de desarrollo se enlaza a localhost y no debe exponerse como alojamiento público. `npm audit --omit=dev` comprueba las dependencias de ejecución; actualizar el lock y repetir pruebas cuando el proveedor publique una solución.

No ocultar los avisos con un `audit fix --force` ni declarar la cadena libre de vulnerabilidades. Antes del primer despliegue y en cada actualización, revisar el estado del aviso, las dependencias y las condiciones de los proveedores. GitHub Actions solo construye código del repositorio; revisar cambios de scripts y configuraciones en los pull requests.
