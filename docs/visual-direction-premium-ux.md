## Dirección visual (fase premium UX)

### Principios

- **Claridad antes que decoración**: jerarquía tipográfica, espacios y estados entendibles.
- **Superficies consistentes**: glass suave para navegación/containers y surface sólida para contenido crítico (error/vacío).
- **Acciones con intención**: primarias con “ink” (`quantia-pink`) o gradiente premium; secundarias outline consistente.
- **Estados explícitos**: loading/error/empty/sync siempre con el mismo patrón visual (banner/alert + card).
- **Motion sobrio**: transiciones cortas para continuidad, sin “ruido”.

### Sistema mínimo (tokens + clases)

- **Tokens** en `src/index.css`: radios, superficies, focus ring.
- **Clases utilitarias**: `ui-surface`, `ui-surface-solid`, `ui-label`, `ui-title`, `ui-body`, `ui-focus-ring`.

### Qué NO hacemos en esta fase

- No rediseño completo de cada pantalla.
- No nueva librería de diseño.
- No “tema oscuro” global (Auth puede mantener su estética puntual).

### Patrón de carga (fase 2)

- **Shimmer**: clase `.ui-skeleton` + componentes `Skeleton` / `SkeletonText` (`src/components/ui/skeleton.tsx`).
- **Pantalla completa / boot**: `AppLoadingSurface` (`src/components/ui/app-loading-surface.tsx`), compartido entre `App.tsx` y `PracticeAppShell` (Suspense y estados de auth/sync).
- **Carga en contexto (banco de preguntas)**: `InlineLoadingPanel` en el mismo módulo, con `ui-surface-solid` y `BrandSpinner`.
- **Tabs del dashboard (lazy)**: `DashboardTabFallback` usa `SectionCard` + skeletons en lugar de texto plano.
- **Charts / admin**: fallbacks con `Skeleton` y etiquetas `role="status"` + `aria-busy` donde aplica.

### Criterios consolidados

- Misma familia visual que **Card** / **superficies** (bordes suaves, sin spinners arbitrarios en cada pantalla).
- **Accesibilidad**: texto visible para la carga a nivel de pantalla; spinners decorativos cuando hay titular.

