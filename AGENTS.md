# Repository Guidelines

## Project Structure & Module Organization

CYMT STORE is a Next.js App Router storefront. Routes, layouts, global CSS, and API handlers belong in `src/app/`; dynamic routes use bracket folders such as `src/app/producto/[slug]/`. Keep reusable UI in `src/components/`, grouped by feature (`home/`, `product/`, `cart/`, `layout/`). Shared data, integrations, and helpers live in `src/data/`, `src/lib/`, and `src/config/`. Database connection and Drizzle schema definitions are in `src/db/`.

Store application-owned static assets—such as logos, icons, and fixed resources—under `public/` and reference them with root-relative paths. This is not a placement rule for product images: their strategy follows the **Imágenes** rules and is not yet definitively defined. Consult `public/images/README.md` for asset conventions. `src/data/catalog.ts` is inherited code; it is not the persistent source of truth for products.

## Build, Test, and Development Commands

- `npm install` installs the dependencies locked in `package-lock.json`.
- `npm run dev` starts the local Next.js development server.
- `npm run lint` runs the Next.js Core Web Vitals ESLint configuration.
- `npm run typecheck` validates strict TypeScript without emitting files.
- `npm run build` creates a production build; `npm run start` serves it.

There is no automated unit-test script yet. Exercise affected pages and API routes manually, and add test coverage with any future test framework. Run checks that match the change; documentation-only changes require no build, lint, or typecheck.

## Coding Style & Naming Conventions

Use strict TypeScript and the `@/` alias for imports from `src/`. Match existing code: two-space indentation, semicolons, double quotes, PascalCase React components, camelCase functions and values, and lowercase kebab-case component filenames (for example, `product-card.tsx`). Use Next.js route filenames (`page.tsx`, `route.ts`). Prefer Tailwind utilities and shared UI components instead of duplicate styles.

## CYMT STORE Architecture & Safety Rules

### 1. Fuente de verdad

PostgreSQL es la fuente persistente de verdad para productos. No crear un segundo catálogo persistente, otra tabla `products`, una arquitectura paralela, ni reintroducir `catalog.ts` o `localStorage` como datastore principal de productos.

### 2. Arquitectura actual de productos

El flujo validado es:

`PostgreSQL → /api/admin/products → EditorProvider → useLiveProducts() → ProductBrowser → storefront`

Mantenerlo salvo solicitud explícita. `ProductBrowser` consume `useLiveProducts()` como catálogo vivo; no reintroducir silenciosamente un fallback a `products` de `catalog.ts`.

### 3. API de productos

La ruta existente es `/api/admin/products` y soporta `GET`, `POST`, `PATCH` y `DELETE` persistentes. No asumir ni crear `/api/admin/products/[id]` sin necesidad. Antes de consumir o modificar la API, leer su implementación y respetar su contrato; no duplicar endpoints que ya resuelvan la operación.

### 4. CRUD persistente

Crear, editar y eliminar productos debe persistir en PostgreSQL y seguir reflejado tras recargar. TypeScript por sí solo no completa una tarea CRUD: cuando se afecte almacenamiento, verificar persistencia real de forma segura.

### 5. EditorProvider

`EditorProvider` sigue siendo esencial. No reemplazarlo para tareas pequeñas ni eliminar funciones sin entender dependencias. Debe conservar estado del editor, apertura/cierre de panel, edición visual, CRUD de productos, comportamiento actual del logo y overrides o estado temporal que siga siendo útil. La persistencia permanente pertenece a PostgreSQL.

### 6. Mutaciones del editor

La persistencia de productos es asíncrona y sus mutaciones pueden encolarse para preservar orden. No eliminar, simplificar ni cambiar esa concurrencia sin analizar su motivo; evitar que una edición anterior sobrescriba otra posterior.

### 7. localStorage

Puede guardar preferencias, estado temporal, drafts, interfaz o sesión del editor cuando corresponda. Nunca sustituye PostgreSQL como persistencia permanente de productos.

### 8. catalog.ts

`catalog.ts` es código heredado del diseño inicial. No borrarlo automáticamente, migrar todo el proyecto por encontrar referencias, ni modificarlo para crear productos persistentes. Migrar cada dependencia heredada de manera explícita, controlada y dentro de la tarea actual.

### 9. Cambios mínimos y alcance

Antes de editar: identificar el comportamiento solicitado, leer completos los archivos directamente relacionados, entender dependencias y hacer el cambio mínimo. Preferir modificaciones pequeñas y localizadas. No realizar refactorizaciones generales, limpiezas no relacionadas ni cambios fuera de alcance.

### 10. No reconstruir el proyecto

Nunca reemplazar CYMT STORE por starters, templates, proyectos nuevos, implementaciones genéricas o ecommerce simplificados. Conservar el producto existente; no reconstruir layout, globals, schema, providers o componentes fundamentales por conveniencia.

### 11. Diseño y UX

Sin solicitud explícita, no modificar diseño visual, colores, branding, tipografías, layout, responsive, navegación, Tailwind, Framer Motion, animaciones, UX, cards ni panel de administración. Una tarea de datos no altera presentación.

### 12. Base de datos

PostgreSQL y Drizzle existen y funcionan. No ejecutar automáticamente `drizzle-kit push`, `drizzle-kit migrate`, `DROP TABLE`, `TRUNCATE`, eliminaciones masivas, resets ni cambios destructivos de schema. No recrear tablas por no encontrarlas de inmediato: primero verificar workspace, variables de entorno, schema y conexión actuales.

### 13. Protección de datos reales

`DATABASE_URL` puede apuntar a datos reales. Nunca modificar productos reales para una prueba técnica sin autorización. Si es imprescindible probar CRUD, usar registros temporales con nombres únicos, modificar solo esos registros, eliminarlos al finalizar y confirmar que no quedan datos de prueba. No hacer pruebas destructivas sobre registros reales.

### 14. Supabase

Supabase forma parte de la infraestructura. No crear otro proyecto, duplicar clientes ni introducir otra estrategia de Storage sin analizar la implementación existente. Reutilizar la infraestructura presente.

### 15. Imágenes

La arquitectura definitiva de imágenes no está completada. Pueden coexistir rutas locales root-relative en `/public`, Supabase Storage previo y URLs en `products.images`; no asumir que todas pertenecen a un único origen. No hacer migraciones masivas ni borrar, mover, renombrar, reorganizar, convertir u optimizar en lote archivos de `public/` sin autorización. Antes de cambiar la estrategia, estudiar `storage.ts`, Supabase Storage, `next/image`, `Product.images`, `editor-panel` y `public/images`.

### 16. Assets del usuario

Los mockups y productos reales son activos del usuario. No borrarlos ni reorganizarlos automáticamente, ni mezclar cambios masivos de assets con commits de arquitectura o CRUD. Mantener los cambios de assets separados.

### 17. next/image

No agregar dominios remotos para ocultar una URL de prueba inválida. Antes de editar `next.config`, confirmar que la URL es válida, si debe ser local o de Supabase Storage, y corregir el dato si el registro es inválido.

### 18. Tipos

Mantener TypeScript estricto: no usar `as any` para ocultar incompatibilidades ni crear un tercer tipo `Product`. Normalizar explícita y tipadamente las diferencias entre filas Drizzle y el modelo frontend, preservando la normalización existente que ya funcione.

### 19. Precio y tipos provenientes de PostgreSQL

Valores como `numeric` de PostgreSQL/Drizzle pueden llegar con otra representación. No cambiar `price`, fechas, campos JSON o IDs sin revisar normalización existente ni romper filtros, sorting o cálculos del storefront.

### 20. Schema existente

`src/db/schema.ts` contiene tablas existentes. Nunca reemplazar el archivo completo para una función puntual; preservar tablas y columnas. Si una tarea requiere schema, leerlo completo, explicar el cambio, modificar solo lo necesario y no ejecutar cambios destructivos sin autorización.

### 21. Secrets

Nunca imprimir `DATABASE_URL`, contraseñas, service-role keys ni tokens; tampoco copiarlos a código o versionar `.env`/`.env.local`. Documentar variables mediante placeholders solamente.

### 22. Archivos generados

No editar intencionalmente archivos generados salvo necesidad documentada. En particular, `next-env.d.ts` suele ser gestionado por Next.js; si cambia al ejecutar Next.js, no mezclarlo con una tarea no relacionada.

### 23. Working tree

Antes de editar, revisar el estado relevante cuando corresponda. Puede haber cambios del usuario: no asumir que fueron creados por Codex, no sobrescribirlos y mantener las modificaciones de la tarea separadas.

### 24. Git Safety

No ejecutar automáticamente `git add .`, `git commit`, `git push`, `git restore .`, `git reset --hard`, `git clean`, checkout destructivo, `git rebase` ni force push salvo solicitud explícita. Nunca usar `git restore .` o `git reset --hard` ante cambios ajenos. Al finalizar, indicar los archivos modificados y dejar el versionado al usuario.

### 25. Workspace Safety

El workspace principal esperado es `C:\Users\5 cm\Desktop\webs\web final`. Antes de cambios importantes, comprobar que es CYMT STORE. Si la ruta no coincide, verificar que existan `package.json`, `src/app`, `src/providers`, `src/db` y `src/app/api/admin/products`; no asumir que el proyecto es incorrecto. Si no aparece una dependencia, API, tabla o archivo que una tarea afirma existente, detenerse, comprobar workspace, reportar la discrepancia y no reconstruir infraestructura automáticamente.

### 26. Validación

La validación corresponde al cambio: typecheck para TypeScript, build para runtime significativo, prueba funcional segura para persistencia y revisión de la página afectada para cambios visuales. No ejecutar verificaciones irrelevantes para documentación.

### 27. Criterio de éxito

No declarar finalizada una funcionalidad solo porque compiló, TypeScript pasó o el build pasó. Comprobar el comportamiento solicitado; por ejemplo, persistencia mediante una lectura posterior o reload cuando aplique.

### 28. Una misión por tarea

CYMT STORE se desarrolla incrementalmente. Mantener un objetivo concreto y no extender alcance: analizar lo necesario → modificar → validar → informar → detenerse. La siguiente funcionalidad pertenece a otra tarea.

## Current CYMT STORE State

- El proyecto usa Next.js App Router, React, TypeScript, TailwindCSS, Drizzle ORM y PostgreSQL; Supabase forma parte de la infraestructura existente.
- La tabla `products` y `/api/admin/products` existen. `GET`, `POST`, `PATCH` y `DELETE` de productos funcionan contra PostgreSQL.
- `EditorProvider` carga productos persistentes y persiste creación, edición y eliminación mediante la API. Las mutaciones por producto preservan orden cuando corresponde.
- `ProductBrowser` utiliza `useLiveProducts()`. El CRUD persistente fue probado contra PostgreSQL; TypeScript y el production build pasaron después de las últimas modificaciones CRUD.
- `catalog.ts` permanece como código heredado, no es la fuente persistente principal de productos y `localStorage` tampoco lo es.
- La estrategia definitiva de imágenes y la importación masiva de mockups/productos no están completadas.
- No asumir que drops o banners migraron a PostgreSQL. Tampoco asumir que auth, login o seguridad de administración están completados sin confirmación explícita.

## Data, Configuration, and Security

Mantén credenciales solo en archivos de entorno locales. Si se necesitara modificar el schema, sigue las reglas de seguridad anteriores y evita cualquier migración o cambio de base de datos sin requerimiento explícito.

## Commits & Pull Requests

Los commits recientes usan asuntos breves, capitalizados y orientados a la acción, a veces en español (por ejemplo, `Complete persistent product CRUD` y `Agrega drops de Nami y Luffy`). Mantén cada commit limitado a un cambio coherente. Los pull requests deben resumir el comportamiento visible, incluir verificaciones, enlazar el issue cuando exista y aportar capturas para cambios visuales o administrativos. Indicar cualquier configuración de entorno o base de datos requerida.
