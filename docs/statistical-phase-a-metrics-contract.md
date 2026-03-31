# Statistical Phase A Metrics Contract

## Objetivo

Formalizar una primera fase estadistica que:

- se pueda implementar sin rehacer por completo el learning engine
- mejore la honestidad inferencial de las metricas actuales
- mantenga compatibilidad con la UX y los read models existentes
- deje preparado el terreno para una fase B con calibracion, dificultad de item y benchmarking de cohorte

La filosofia de esta fase es simple:

1. separar metricas que hoy estan mezcladas
2. anadir flags de muestra y confianza
3. dejar de presentar heuristicas como si fueran mediciones fuertes
4. introducir read models v2 en paralelo, sin romper los contratos actuales

## Problema actual

El sistema actual ya captura senal valiosa:

- cobertura
- precision observada
- latencia
- cambios de respuesta
- errores inferidos
- estados longitudinales por pregunta
- diferencia entre aprendizaje y simulacro

Pero varias metricas mezclan conceptos distintos:

- `readiness` mezcla cobertura, retencion y prior sobre no vistas
- `readiness_lower` y `readiness_upper` se comportan como rango visual, no como incertidumbre estadistica seria
- `weak categories` estan ordenadas por volumen de fallo, no por riesgo ajustado
- `pressure_gap` es util como coaching, pero todavia no es una comparacion ajustada por dificultad

## Principios de la fase A

1. No romper RPCs actuales.
2. Anadir RPCs `v2` y tipos `v2` en paralelo.
3. Toda metrica diagnostica debe llevar `sample_ok` y `confidence_flag`.
4. Toda metrica en porcentaje debe poder responder a la pregunta "sobre cuantas observaciones?".
5. Ninguna metrica predictiva se presenta como exacta si no esta calibrada.

## Alcance

### Entra en fase A

- separar `coverage`, `retention_seen` y `exam_readiness`
- marcar calidad de muestra en `accuracy`, `pressure`, `fatigue` y `category risk`
- sustituir el ranking de categorias debiles por riesgo suavizado
- instrumentar aperturas de explicacion para dejar de perder esa senal
- introducir helpers estadisticos SQL reutilizables
- crear nuevos read models `v2`

### No entra en fase A

- calibracion empirica de `p_correct_estimated`
- dificultad de item oficial
- `pressure_gap` ajustado por dificultad
- benchmarking por cohorte
- percentiles institucionales
- reentrenar o rehacer el learning engine

## Metricas oficiales de fase A

### 1. `coverage_rate`

- tipo: operativa
- estado: `stable`
- formula: `seen_questions / total_questions`
- interpretacion: cuanto banco ha visto el alumno
- muestra minima: no aplica
- observacion: no debe usarse para inferir dominio

### 2. `observed_accuracy_rate`

- tipo: descriptiva
- estado: `stable`
- formula: `correct / answered`
- interpretacion: rendimiento bruto observado
- muestra minima recomendada: `answered >= 30`
- companion fields:
  - `observed_accuracy_n`
  - `observed_accuracy_ci_low`
  - `observed_accuracy_ci_high`
  - `observed_accuracy_sample_ok`

### 3. `retention_seen_rate`

- tipo: predictiva
- estado: `heuristic`
- formula: media de probabilidad de retencion proyectada sobre preguntas vistas
- interpretacion: calidad esperada de recuperacion sobre lo trabajado
- muestra minima recomendada: `seen_questions >= 20`
- companion fields:
  - `retention_seen_n`
  - `retention_seen_confidence_flag`

### 4. `exam_readiness_rate`

- tipo: predictiva compuesta
- estado: `heuristic`
- formula:

```text
exam_readiness_rate =
coverage_rate * retention_seen_rate +
(1 - coverage_rate) * unseen_prior_rate
```

- interpretacion: preparacion media esperada sobre todo el banco
- regla de producto: nunca mostrarla sola; debe convivir con `coverage_rate` y `retention_seen_rate`
- companion fields:
  - `unseen_prior_rate`
  - `exam_readiness_confidence_flag`
  - `exam_readiness_ci_low`
  - `exam_readiness_ci_high`

### 5. `backlog_overdue_count`

- tipo: operativa
- estado: `stable`
- formula: numero de preguntas con `next_review_at <= now`
- interpretacion: deuda inmediata de repaso

### 6. `category_fail_rate_smoothed`

- tipo: diagnostica
- estado: `stable`
- formula:

```text
(incorrect_attempts + alpha) / (attempts + alpha + beta)
```

- interpretacion: riesgo suavizado de error en una categoria
- muestra minima recomendada: `attempts >= 8`
- companion fields:
  - `attempts`
  - `incorrect_attempts`
  - `baseline_fail_rate`
  - `excess_risk`
  - `sample_ok`
  - `confidence_flag`

### 7. `pressure_gap_raw`

- tipo: diagnostica
- estado: `heuristic`
- formula: `learning_accuracy - simulacro_accuracy`
- interpretacion: brecha observada entre estudio y examen sin ajustar
- companion fields:
  - `learning_accuracy`
  - `simulacro_accuracy`
  - `learning_session_n`
  - `simulacro_session_n`
  - `sample_ok`
  - `confidence_flag`
- regla: se mantiene como metrica de coaching, no de benchmarking

### 8. `fatigue_index`

- tipo: diagnostica
- estado: `heuristic`
- interpretacion: deterioro intra-sesion
- companion fields:
  - `questions_answered`
  - `sample_ok`
  - `confidence_flag`

### 9. `overconfidence_index`

- tipo: diagnostica
- estado: `heuristic`
- interpretacion: peso de los errores impulsivos o degradados por revision
- companion fields:
  - `questions_answered`
  - `sample_ok`
  - `confidence_flag`

## Flags oficiales

Todas las metricas sensibles deben poder exponer:

- `sample_ok boolean`
- `confidence_flag text`

Valores validos para `confidence_flag`:

- `low`
- `medium`
- `high`

## Helpers SQL a introducir

La fase A necesita helpers estadisticos reutilizables. Deben quedar en schema `app`.

### 1. `app.wilson_interval_low`

Entrada:

- `p_successes integer`
- `p_trials integer`
- `p_z numeric default 1.96`

Salida:

- `numeric`

Uso:

- `observed_accuracy_ci_low`

### 2. `app.wilson_interval_high`

Entrada:

- `p_successes integer`
- `p_trials integer`
- `p_z numeric default 1.96`

Salida:

- `numeric`

Uso:

- `observed_accuracy_ci_high`

### 3. `app.beta_smoothed_rate`

Entrada:

- `p_successes numeric`
- `p_trials numeric`
- `p_alpha numeric`
- `p_beta numeric`

Salida:

- `numeric`

Uso:

- `category_fail_rate_smoothed`
- futuras tasas suavizadas por item o cohort

### 4. `app.resolve_confidence_flag`

Entrada:

- `p_n integer`
- `p_low_threshold integer`
- `p_high_threshold integer`

Salida:

- `text`

Uso:

- estandarizar flags de calidad en todos los read models

## Nuevas tablas y eventos

### 1. `app.question_explanation_events`

Objetivo:

- registrar aperturas de explicacion de forma real, no inferida

Campos minimos:

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references app.user_profiles(user_id) on delete cascade,
question_id text not null,
session_id uuid null references app.practice_sessions(session_id) on delete set null,
curriculum text not null default 'general',
opened_at timestamptz not null default timezone('utc', now()),
surface text not null,
explanation_kind text not null default 'base',
created_at timestamptz not null default timezone('utc', now())
```

Valores esperados:

- `surface`: `quiz`, `review`, `study`, `admin`
- `explanation_kind`: `base`, `editorial`, `both`

Nota:

En fase A no es obligatorio usar este dato en el scoring principal. El objetivo es dejar de perder una senal importante y poder explotarla en fase B.

### 2. Actualizacion de `app.user_question_state`

No hace falta cambiar el modelo fuerte de la tabla, pero si el pipeline:

- `times_explanation_opened` debe pasar de placeholder a contador real
- el incremento debe ocurrir desde eventos, no desde heuristica de cliente

## Nuevos read models

La fase A se apoya en tres RPCs `v2` y un RPC de soporte para eventos.

### 1. `app.get_readiness_dashboard_v2`

Objetivo:

- separar preparacion del examen en componentes visibles
- anadir incertidumbre y flags de calidad

Firma propuesta:

```sql
create or replace function app.get_readiness_dashboard_v2(
  p_curriculum text default 'general'
)
returns table (
  total_questions integer,
  seen_questions integer,
  coverage_rate numeric,
  observed_accuracy_rate numeric,
  observed_accuracy_n integer,
  observed_accuracy_ci_low numeric,
  observed_accuracy_ci_high numeric,
  observed_accuracy_sample_ok boolean,
  retention_seen_rate numeric,
  retention_seen_n integer,
  retention_seen_confidence_flag text,
  unseen_prior_rate numeric,
  exam_readiness_rate numeric,
  exam_readiness_ci_low numeric,
  exam_readiness_ci_high numeric,
  exam_readiness_confidence_flag text,
  backlog_overdue_count integer,
  fragile_count integer,
  consolidating_count integer,
  solid_count integer,
  mastered_count integer,
  recommended_review_count integer,
  recommended_new_count integer,
  recommended_today_count integer,
  recommended_mode text,
  focus_message text
)
```

Notas de implementacion:

- `coverage_rate` sale de `seen_questions / total_questions`
- `observed_accuracy_rate` se calcula desde `user_question_state` o `practice_profiles`
- `retention_seen_rate` sale de la media de probabilidad proyectada sobre vistas
- `unseen_prior_rate` debe quedar explicito; se puede mantener en `0.25` en fase A
- `exam_readiness_rate` usa la formula oficial compuesta
- `exam_readiness_ci_*` puede ser aproximacion bootstrap ligera o intervalo heredado provisional marcado como `low`

Compatibilidad:

- no elimina `app.get_readiness_dashboard`
- el frontend puede migrar bloque a bloque

### 2. `app.get_category_risk_dashboard`

Objetivo:

- reemplazar top categorias por volumen bruto con un ranking por riesgo suavizado

Firma propuesta:

```sql
create or replace function app.get_category_risk_dashboard(
  p_curriculum text default 'general',
  p_limit integer default 5,
  p_question_scope text default 'all'
)
returns table (
  category text,
  attempts bigint,
  incorrect_attempts bigint,
  raw_fail_rate numeric,
  smoothed_fail_rate numeric,
  baseline_fail_rate numeric,
  excess_risk numeric,
  sample_ok boolean,
  confidence_flag text
)
```

Reglas:

- `raw_fail_rate = incorrect_attempts / attempts`
- `smoothed_fail_rate = beta_smoothed_rate(...)`
- `baseline_fail_rate` se puede calcular a nivel de curriculum y scope del mismo alumno o del conjunto de categorias visibles
- `excess_risk = smoothed_fail_rate - baseline_fail_rate`
- ordenar por `excess_risk desc`, luego `attempts desc`

Nota:

Si no existe baseline de cohorte todavia, fase A puede usar baseline interno del propio alumno en el curriculum. Eso no es benchmarking, pero ya evita la trampa del volumen puro.

### 3. `app.get_pressure_dashboard_v2`

Objetivo:

- mantener utilidad pedagogica del `pressure_gap`
- anadir flags para no sobrerreaccionar a muestras pequenas

Firma propuesta:

```sql
create or replace function app.get_pressure_dashboard_v2(
  p_curriculum text default 'general'
)
returns table (
  learning_accuracy numeric,
  simulacro_accuracy numeric,
  pressure_gap_raw numeric,
  learning_session_n integer,
  simulacro_session_n integer,
  learning_question_n integer,
  simulacro_question_n integer,
  avg_simulacro_fatigue numeric,
  overconfidence_rate numeric,
  sample_ok boolean,
  confidence_flag text,
  recommended_mode text,
  pressure_message text
)
```

Reglas de validez:

- `sample_ok = true` solo si hay al menos `2` simulacros terminados y `40` preguntas comparables del lado simulacro
- si `sample_ok = false`, se puede seguir devolviendo la metrica, pero con `confidence_flag = low`

Nota:

En fase A se mantiene `pressure_gap_raw`. La version ajustada por dificultad queda para fase B.

### 4. `app.record_question_explanation_opened`

Objetivo:

- convertir aperturas de explicacion en un evento persistente

Firma propuesta:

```sql
create or replace function app.record_question_explanation_opened(
  p_question_id text,
  p_curriculum text default 'general',
  p_session_id uuid default null,
  p_surface text default 'review',
  p_explanation_kind text default 'base'
)
returns void
```

Responsabilidades:

- insertar en `app.question_explanation_events`
- actualizar `times_explanation_opened` en `app.user_question_state` si existe estado para esa pregunta

## Tipos frontend propuestos

### Nuevo contrato `PracticeLearningDashboardV2`

Debe convivir con el actual.

Campos minimos:

```ts
type ConfidenceFlag = 'low' | 'medium' | 'high';

interface PracticeLearningDashboardV2 {
  totalQuestions: number;
  seenQuestions: number;
  coverageRate: number;
  observedAccuracyRate: number;
  observedAccuracyN: number;
  observedAccuracyCiLow: number | null;
  observedAccuracyCiHigh: number | null;
  observedAccuracySampleOk: boolean;
  retentionSeenRate: number | null;
  retentionSeenN: number;
  retentionSeenConfidenceFlag: ConfidenceFlag;
  unseenPriorRate: number;
  examReadinessRate: number;
  examReadinessCiLow: number | null;
  examReadinessCiHigh: number | null;
  examReadinessConfidenceFlag: ConfidenceFlag;
  backlogOverdueCount: number;
  fragileCount: number;
  consolidatingCount: number;
  solidCount: number;
  masteredCount: number;
  recommendedReviewCount: number;
  recommendedNewCount: number;
  recommendedTodayCount: number;
  recommendedMode: string;
  focusMessage: string;
}
```

### Nuevo contrato `PracticeCategoryRiskSummary`

```ts
interface PracticeCategoryRiskSummary {
  category: string;
  attempts: number;
  incorrectAttempts: number;
  rawFailRate: number;
  smoothedFailRate: number;
  baselineFailRate: number;
  excessRisk: number;
  sampleOk: boolean;
  confidenceFlag: 'low' | 'medium' | 'high';
}
```

### Nuevo contrato `PracticePressureInsightsV2`

```ts
interface PracticePressureInsightsV2 {
  learningAccuracy: number | null;
  simulacroAccuracy: number | null;
  pressureGapRaw: number | null;
  learningSessionN: number;
  simulacroSessionN: number;
  learningQuestionN: number;
  simulacroQuestionN: number;
  avgSimulacroFatigue: number | null;
  overconfidenceRate: number | null;
  sampleOk: boolean;
  confidenceFlag: 'low' | 'medium' | 'high';
  recommendedMode: string | null;
  pressureMessage: string;
}
```

## Migraciones propuestas

La fase A se puede ejecutar en cuatro migraciones pequenas.

### Migracion 1. `statistical_phase_a_helpers.sql`

Incluye:

- `app.wilson_interval_low`
- `app.wilson_interval_high`
- `app.beta_smoothed_rate`
- `app.resolve_confidence_flag`

### Migracion 2. `question_explanation_events.sql`

Incluye:

- tabla `app.question_explanation_events`
- indices por `user_id`, `curriculum`, `question_id`, `opened_at`
- RPC `app.record_question_explanation_opened`

### Migracion 3. `readiness_dashboard_v2.sql`

Incluye:

- `app.get_readiness_dashboard_v2`

### Migracion 4. `category_risk_and_pressure_v2.sql`

Incluye:

- `app.get_category_risk_dashboard`
- `app.get_pressure_dashboard_v2`

## Cambios frontend minimos

1. Mantener `getMyPracticeState` tal y como esta para no romper la app.
2. Anadir lectura optativa de:
   - `get_readiness_dashboard_v2`
   - `get_category_risk_dashboard`
   - `get_pressure_dashboard_v2`
3. En `Stats`, sustituir:
   - `readiness` hero unico
     por:
   - `Preparacion examen`
   - `Retencion vista`
   - `Cobertura`
   - `Brecha de presion`
4. En `Study`, no tocar reglas de recomendacion en fase A salvo mejorar el copy con flags de muestra.
5. En `Review` y `QuestionExplanation`, emitir `record_question_explanation_opened`.

## Compatibilidad y rollout

### Estrategia

1. desplegar migraciones nuevas
2. anadir mappers `v2`
3. activar consumo `v2` detras de fallback silencioso
4. comparar resultados de `v1` y `v2` durante una ventana de validacion
5. solo despues retirar metricas viejas de la UI

### Politica de fallback

- si falla cualquier RPC `v2`, la app usa `v1`
- ningun flujo de estudio debe depender en fase A de un read model `v2` para seguir funcionando

## Criterios de validacion

La fase A no se considera cerrada hasta cumplir esto:

1. `coverage_rate`, `retention_seen_rate` y `exam_readiness_rate` aparecen separados en al menos una vista interna.
2. Ninguna categoria se etiqueta como critica si `attempts < 8`.
3. `pressure_gap_raw` no se muestra como fuerte si `sample_ok = false`.
4. Las aperturas de explicacion quedan persistidas como eventos.
5. Los read models `v1` siguen funcionando.
6. Los tests de mapeo contemplan `confidence_flag` y `sample_ok`.

## Riesgos conocidos

1. El prior `0.25` para preguntas no vistas sigue siendo una decision de producto. Fase A solo lo explicita; no lo calibra.
2. `pressure_gap_raw` seguira mezclando dificultad y composicion del set hasta fase B.
3. El smoothing de categorias mejora robustez, pero no sustituye un benchmark de cohorte real.
4. Sin una definicion fuerte de `item difficulty`, las comparaciones entre alumnos seguiran siendo parciales.

## Resultado esperado al cerrar fase A

Oposik pasa de tener metricas utiles pero semanticamente mezcladas a tener:

- un contrato oficial de metricas
- separacion entre cobertura, retencion y preparacion
- indicadores con flags de muestra
- categorias debiles ordenadas por riesgo mas justo
- `pressure gap` presentado con mas honestidad
- una base de eventos mejor para explotar explicaciones y ayuda

La promesa de la fase A no es "medirlo todo perfecto".
La promesa es "dejar de interpretar demasiado fuerte metricas que todavia son heuristicas, sin perder utilidad operativa".
