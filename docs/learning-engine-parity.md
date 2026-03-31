## Paridad learning engine (cliente vs Edge)

Este repositorio contiene **dos copias** del learning engine:

- **Cliente**: `src/domain/learningEngine/`
- **Edge (Supabase)**: `supabase/functions/_shared/learning-engine/`

### Qué validamos hoy

- **Paridad de comportamiento** mediante tests que comparan salidas (cliente vs Edge) para casos representativos:
  - `src/domain/learningEngine/edgeParity.test.ts`
- **Ejecución de tests del motor en Edge** dentro de `npm test` (Vitest incluye también):
  - `supabase/functions/_shared/learning-engine/**/*.test.ts`

Esto hace que CI falle si:
- una copia cambia su comportamiento y la otra no, o
- se rompen los tests del motor en cualquiera de las rutas.

### Fuente de verdad / estrategia actual

Estrategia intermedia deliberada: **duplicación controlada + validación automática de paridad**.
Todavía no se unifica en un paquete compartido para evitar riesgo de rearquitectura prematura.

### Deuda pendiente (si crece el motor)

- Ampliar fixtures/casos de paridad (más edge cases) a medida que se añadan modos o cambios de scheduler.
- Considerar una unificación real (paquete compartido) cuando el coste de la duplicación supere el riesgo de migración.

