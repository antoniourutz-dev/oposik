# Importador de leyes (workspace «Aprender leyes»)

Carga filas en `app.general_laws` y `app.general_law_blocks` a partir de CSV con formato fijo. Las preguntas (`public.preguntas`) no se importan aquí: enlázalas después con `curriculum_key = leyes_generales`, `general_law_id`, `general_law_block_id` y `ley_referencia` coherente con `legal_reference_label`.

## Requisitos

- Node 18+
- Variables de entorno (solo para import **real**, no para `DRY_RUN`):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (la inserción no está expuesta por RLS a usuarios finales)

## Plantillas oficiales

| Archivo | Contenido |
|---------|-----------|
| `plantilla-leyes.csv` | Una fila por norma (`law_key` único). |
| `plantilla-bloques.csv` | Una fila por bloque; se enlaza con `law_key`. |

- Codificación: **UTF-8**
- Separador: **coma** (`,`)
- Primera fila: cabeceras exactamente como en la plantilla

## Uso

```bash
# Simulación (no escribe en la base)
set DRY_RUN=1
node scripts/import-general-laws/import-general-laws.mjs --laws scripts/import-general-laws/mis-leyes.csv --blocks scripts/import-general-laws/mis-bloques.csv
```

En PowerShell:

```powershell
$env:DRY_RUN="1"
node scripts/import-general-laws/import-general-laws.mjs --laws .\scripts\import-general-laws\mis-leyes.csv --blocks .\scripts\import-general-laws\mis-bloques.csv
```

Import real (quitar `DRY_RUN` o poner `DRY_RUN=0`):

```bash
node scripts/import-general-laws/import-general-laws.mjs --laws mis-leyes.csv --blocks mis-bloques.csv
```

## Columnas obligatorias

### Leyes (`plantilla-leyes.csv`)

| Columna | Notas |
|---------|--------|
| `law_key` | Identificador estable (sin espacios recomendado). Único. |
| `title` | Título largo. |
| `short_title` | Título corto UI. |
| `legal_reference_label` | Referencia legal; conviene que coincida con `ley_referencia` en preguntas. |
| `sort_order` | Entero (orden de visualización). |

Opcionales: `status` (`draft` \| `review` \| `published` \| `archived`), `training_intent`, `min_questions_to_publish` (entero ≥ 1).

### Bloques (`plantilla-bloques.csv`)

| Columna | Notas |
|---------|--------|
| `law_key` | Debe existir en el CSV de leyes de esta misma importación. |
| `block_key` | Único por ley. |
| `title` | Título del bloque. |
| `sort_order` | Entero. |
| `depth` | 0, 1 o 2. |
| `parent_block_key` | Vacío si es raíz; si no, `block_key` del padre **en la misma ley**. |

Opcionales: `status`, `min_questions_for_training`, `training_focus`.

## Preguntas (`plantilla-preguntas.csv`)

Importa filas en `public.preguntas` con `curriculum_key = leyes_generales`, enlazando `general_law_id` y `general_law_block_id` a partir de **`law_key`** y **`block_key`** (deben existir ya en la base por un import previo de leyes/bloques).

### Uso

```bash
# Solo validar CSV (sin credenciales: solo columnas obligatorias)
DRY_RUN=1 node scripts/import-general-laws/import-general-law-questions.mjs --questions mis-preguntas.csv

# Validar resolución de leyes/bloques en Supabase sin insertar
DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-general-laws/import-general-law-questions.mjs --questions mis-preguntas.csv

# Insertar
node scripts/import-general-laws/import-general-law-questions.mjs --questions mis-preguntas.csv
```

O: `npm run import:general-law-questions -- --questions mis-preguntas.csv`

### Columnas

| Columna | Obligatorio | Descripción |
|---------|-------------|-------------|
| `law_key` | Sí | Debe existir en `app.general_laws`. |
| `block_key` | Sí | Debe existir en `app.general_law_blocks` para esa ley. |
| `question_scope_key` | Sí | `common`, `specific` o `mixed`. |
| `ley_referencia` | No | Si va vacío, se usa `legal_reference_label` de la ley en base. |
| `enunciado` | Sí | Texto de la pregunta. |
| `opcion_a` … `opcion_d` | Sí | Cuatro respuestas. |
| `respuesta_correcta` | Sí | Letra `a`–`d` o número `1`–`4`. |
| `numero` | No | Número de pregunta. |
| `categoria`, `temario_pregunta`, `explicacion`, `explicacion_editorial` | No | Metadatos / explicaciones. |
| `id` | No | UUID fijo para reimportar o enlazar; si se omite, se genera uno nuevo. |

Campos con comas o saltos de línea: entre comillas dobles `"...""..."` según CSV estándar.

**Nota:** Los nombres de columna en base (`pregunta`, `opcion_a`, etc.) deben coincidir con tu tabla `public.preguntas`. Si tu proyecto usa otros nombres (por ejemplo solo `enunciado`), adapta el script `import-general-law-questions.mjs` o la vista en Supabase.

## Errores frecuentes

- `law_key` en bloques que no está en el CSV de leyes.
- `parent_block_key` apuntando a un bloque que no existe o a otro orden de inserción incorrecto (el script ordena por `depth` y `sort_order`).
- Caracteres especiales sin comillas: rodea el campo con `"` y duplica comillas internas `""`.
- Preguntas: `law_key`/`block_key` inexistentes tras importar leyes, o `ley_referencia` vacía sin `legal_reference_label` en la ley.
