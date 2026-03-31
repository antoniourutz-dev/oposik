# Premium Learning Engine Implementation Plan

## Objetivo

Convertir Oposik desde un flujo de practica por bloques en un sistema exam-aware que:

- modele cada pregunta como una memoria dinamica
- priorice el estudio mas rentable para la fecha de examen
- mida dominio, fragilidad, velocidad y riesgo real
- mantenga una UX limpia y profesional

## Estado actual del proyecto

### Lo que ya existe

- banco de preguntas y sesiones de practica
- perfil por usuario y curriculum
- estadisticas basicas por pregunta
- sesiones `standard`, `random` y `weakest`
- dashboard, review y admin funcionales

### Limites actuales

- no existe estado individual avanzado por pregunta
- no hay scheduler de repaso real
- no se modelan latencia, lapsos, exam readiness ni carga diaria
- `practice_question_stats` solo guarda agregados simples
- `practice_sessions` no distingue aprendizaje, mantenimiento ni fatiga

## Principio de arquitectura

No meter logica matematica dentro del frontend.

La arquitectura objetivo debe quedar partida en cuatro capas:

1. `app` schema de Supabase para estado, eventos y RPCs
2. funciones puras de calculo en TypeScript para simulacion, testeo y backtesting
3. RPCs SQL para lectura rapida y persistencia atomica
4. frontend consumiendo read models, no reglas de negocio dispersas

## Modelo de datos objetivo

### 1. `app.user_question_state`

Estado vivo por usuario, pregunta y curriculum.

Campos minimos:

```sql
user_id uuid not null,
question_id uuid not null,
curriculum text not null,
attempts integer not null default 0,
correct_attempts integer not null default 0,
incorrect_attempts integer not null default 0,
consecutive_correct integer not null default 0,
consecutive_incorrect integer not null default 0,
last_result text null,
last_selected_option text null,
last_seen_at timestamptz null,
last_correct_at timestamptz null,
next_review_at timestamptz null,
mastery_level smallint not null default 0,
stability_score numeric not null default 1,
retrievability_score numeric not null default 0.25,
p_correct_estimated numeric not null default 0.25,
avg_response_time_ms integer null,
median_response_time_ms integer null,
fast_correct_count integer not null default 0,
slow_correct_count integer not null default 0,
lapse_count integer not null default 0,
exam_retention_probability numeric not null default 0.25,
reviews_needed_before_exam integer not null default 0,
dominant_error_type text null,
times_explanation_opened integer not null default 0,
times_changed_answer integer not null default 0,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
primary key (user_id, curriculum, question_id)
```

### 2. `app.question_attempt_events`

Evento inmutable por respuesta.

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null,
question_id uuid not null,
session_id uuid not null,
curriculum text not null,
answered_at timestamptz not null default now(),
selected_option text null,
correct_option text not null,
is_correct boolean not null,
response_time_ms integer null,
time_to_first_selection_ms integer null,
changed_answer boolean not null default false,
error_type_inferred text null,
mastery_before smallint null,
mastery_after smallint null,
p_correct_before numeric null,
p_correct_after numeric null,
stability_before numeric null,
stability_after numeric null,
next_review_before timestamptz null,
next_review_after timestamptz null
```

### 3. `app.practice_sessions`

Extender la tabla actual, no crear otra paralela.

Campos nuevos:

```sql
mode text not null,
questions_answered integer not null default 0,
correct_count integer not null default 0,
incorrect_count integer not null default 0,
accuracy numeric not null default 0,
avg_response_time_ms integer null,
new_questions_count integer not null default 0,
review_questions_count integer not null default 0,
mastery_gains integer not null default 0,
mastery_losses integer not null default 0,
fatigue_score numeric null,
readiness_before numeric null,
readiness_after numeric null
```

### 4. `app.exam_targets`

Configuracion de examen por usuario y curriculum.

```sql
user_id uuid not null,
curriculum text not null,
exam_date date null,
daily_review_capacity integer not null default 35,
daily_new_capacity integer not null default 10,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
primary key (user_id, curriculum)
```

### 5. `app.question_editorial_meta`

Metadatos premium de cada pregunta.

```sql
question_id uuid primary key,
curriculum text not null,
topic text null,
subtopic text null,
difficulty_editorial numeric null,
question_type text null,
trap_tags text[] not null default '{}',
law_reference text null,
memory_anchor text null,
explanation_short text null,
explanation_trap text null
```

## Contratos TypeScript objetivo

### `src/domain/learningEngine/types.ts`

```ts
export type ErrorType =
  | 'concepto'
  | 'literalidad'
  | 'plazo'
  | 'organo_competente'
  | 'procedimiento'
  | 'excepcion'
  | 'negacion'
  | 'distractor_cercano'
  | 'lectura_rapida'
  | 'sobreconfianza'
  | 'confusion_entre_normas'
  | 'memoria_fragil';

export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

export interface UserQuestionState {
  userId: string;
  questionId: string;
  curriculum: string;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  lastResult: 'correct' | 'incorrect' | null;
  lastSelectedOption: 'a' | 'b' | 'c' | 'd' | null;
  nextReviewAt: string | null;
  masteryLevel: MasteryLevel;
  stabilityScore: number;
  retrievabilityScore: number;
  pCorrectEstimated: number;
  examRetentionProbability: number;
  dominantErrorType: ErrorType | null;
}

export interface AttemptInput {
  sessionId: string;
  questionId: string;
  curriculum: string;
  selectedOption: 'a' | 'b' | 'c' | 'd' | null;
  correctOption: 'a' | 'b' | 'c' | 'd';
  isCorrect: boolean;
  responseTimeMs: number | null;
  timeToFirstSelectionMs: number | null;
  changedAnswer: boolean;
  answeredAt: string;
}

export interface ReadinessSnapshot {
  readiness: number;
  readinessLower: number | null;
  readinessUpper: number | null;
  overdueCount: number;
  fragileCount: number;
  masteredCount: number;
  projectedReadiness: number | null;
}
```

## Motor de calculo

### Nuevo modulo

`src/domain/learningEngine/`

Archivos:

- `probability.ts`
- `stability.ts`
- `scheduler.ts`
- `errorInference.ts`
- `readiness.ts`
- `sessionPlanning.ts`
- `types.ts`
- `__tests__/...`

### Reglas

- funciones puras
- sin acceso directo a Supabase
- todos los inputs y outputs serializables
- cubiertas por tests numericos

## RPCs objetivo

### 1. `app.record_question_attempt_batch`

Sustituye progresivamente la logica actual de `record_practice_session`.

Responsabilidades:

- persistir eventos
- actualizar `user_question_state`
- recalcular readiness minimo
- cerrar la sesion

Entrada:

```json
{
  "p_session_id": "uuid",
  "p_curriculum": "general",
  "p_mode": "mixed",
  "p_started_at": "iso",
  "p_finished_at": "iso",
  "p_attempts": []
}
```

### 2. `app.get_daily_focus`

Devuelve la prioridad del dia.

Salida:

```json
{
  "overdue_count": 18,
  "fragile_count": 12,
  "new_recommended": 8,
  "recommended_mode": "mixed",
  "message": "Hoy conviene consolidar 18 preguntas urgentes."
}
```

### 3. `app.get_readiness_dashboard`

Read model para home/stats.

Debe devolver:

- readiness actual
- rango de confianza inicial simple
- dominadas, fragiles, nuevas
- riesgos principales por `dominant_error_type`
- backlog real y backlog recomendado hoy

### 4. `app.get_mixed_practice_batch`

Selector premium por prioridad.

Entrada:

- curriculum
- target size
- exam date opcional
- capacities del usuario

Regla inicial:

- 50% overdue
- 20% fragiles
- 20% nuevas
- 10% mantenimiento o anti-trampas

### 5. `app.get_due_review_batch`

Solo preguntas con `next_review_at <= now`.

### 6. `app.get_anti_trap_batch`

Filtra por `trap_tags` y `dominant_error_type`.

### 7. `app.get_simulacro_batch`

Muestra preguntas sin correccion inmediata.
No debe reordenar con el mismo peso que una sesion de aprendizaje.

## Cambios en el frontend

### Dashboard

Sustituir el resumen actual por:

- readiness
- foco del dia
- mapa de dominio
- riesgos principales
- backlog recomendado, no backlog bruto

### Modos de estudio

Ampliar `PracticeMode`:

```ts
type PracticeMode =
  | 'standard'
  | 'weakest'
  | 'random'
  | 'review'
  | 'mixed'
  | 'simulacro'
  | 'anti_trap';
```

### Quiz

Guardar y enviar:

- `response_time_ms`
- `time_to_first_selection_ms`
- `changed_answer`

### Review

Separar review pedagógica de simulacro.

### Profile

Nueva configuracion:

- fecha de examen
- capacidad diaria de repaso
- capacidad diaria de nuevas

## Algoritmos: version inicial implementable

### Probabilidad base

```ts
export function computeBaseProbability(attempts: number, correctAttempts: number): number {
  if (attempts === 0) return 0.25;
  return (correctAttempts + 1) / (attempts + 2);
}
```

### Probabilidad reciente

```ts
export function computeRecentProbability(results: Array<0 | 0.2 | 0.8 | 1>): number {
  const weights = [0.5, 0.3, 0.2];
  return results.slice(0, 3).reduce((acc, value, index) => acc + value * weights[index], 0);
}
```

### Factor latencia

```ts
export function computeLatencyFactor(responseTimeMs: number, referenceTimeMs: number): number {
  const raw = referenceTimeMs / Math.max(responseTimeMs, 1);
  return Math.min(1.05, Math.max(0.7, raw));
}
```

### Penalizacion por error

```ts
export function computeErrorPenalty(errorType: ErrorType | null): number {
  switch (errorType) {
    case 'plazo':
    case 'excepcion':
    case 'negacion':
      return 0.12;
    case 'lectura_rapida':
    case 'sobreconfianza':
      return 0.1;
    case 'literalidad':
    case 'distractor_cercano':
      return 0.08;
    default:
      return 0.04;
  }
}
```

### Mastery level

Regla inicial:

- nivel 0: `attempts = 0`
- nivel 1: `pEstimated < 0.65` o `consecutiveCorrect < 2`
- nivel 2: `pEstimated >= 0.65` y `consecutiveCorrect >= 2`
- nivel 3: `pEstimated >= 0.78` y `consecutiveCorrect >= 3`
- nivel 4: `pEstimated >= 0.85`, `consecutiveCorrect >= 4`, exito en fechas distintas

### Estabilidad

```ts
export function updateStabilityScore(
  oldStability: number,
  isCorrect: boolean,
  latencyFactor: number,
): number {
  if (!isCorrect) return Math.max(1, oldStability * 0.45);
  const multiplier = latencyFactor >= 1 ? 1.8 : 1.45;
  return Math.max(1, oldStability * multiplier);
}
```

### Intervalo

```ts
export function computeNextIntervalDays(params: {
  isCorrect: boolean;
  masteryLevel: MasteryLevel;
  difficultyFactor: number;
  latencyFactor: number;
  examFactor: number;
}): number {
  if (!params.isCorrect) return 1;
  const baseByLevel = [1, 3, 7, 14, 21];
  const base = baseByLevel[params.masteryLevel];
  return Math.max(
    1,
    Math.round(base * params.difficultyFactor * params.latencyFactor * params.examFactor),
  );
}
```

## Orden correcto de implementacion

### Fase 1. Infraestructura de aprendizaje

- nueva migracion con `user_question_state`, `question_attempt_events` y `exam_targets`
- extension de `practice_sessions`
- funciones puras con tests
- nueva RPC `record_question_attempt_batch`

Resultado esperado:

- ya existe estado individual por pregunta
- cada respuesta modifica dominio, estabilidad e intervalo

### Fase 2. Selector y dashboard inteligente

- `get_daily_focus`
- `get_readiness_dashboard`
- `get_mixed_practice_batch`
- adaptar home y stats

Resultado esperado:

- la app ya decide que conviene estudiar hoy

### Fase 3. Latencia y errores tipificados

- cronometraje completo en quiz
- inferencia inicial de errores
- anti-trap batch
- widgets de riesgos principales

Resultado esperado:

- la app deja de medir solo acierto/fallo

### Fase 4. Exam aware

- fecha de examen en perfil
- compresion de intervalos
- projection readiness
- backlog recomendado por capacidad diaria

Resultado esperado:

- la app empieza a comportarse como preparador real

### Fase 5. Simulacro y fatiga

- simulacro separado
- fatigue score
- diferencia entre rendimiento de estudio y simulacro

Resultado esperado:

- entrenamiento mas realista y analitica seria

## Riesgos reales si se intenta hacer mal

- meter toda la logica en SQL desde el primer dia
- recalcular readiness completo en cada respuesta sin read models
- sobrecargar la home con demasiadas metricas a la vez
- mostrar backlog total sin limitar la carga recomendada
- usar solo porcentaje bruto sin suavizado ni recencia

## Siguiente accion recomendada

No empezar por UX nueva.

La siguiente accion correcta en este repo es:

1. crear migracion `user_question_state` + `question_attempt_events` + `exam_targets`
2. introducir `src/domain/learningEngine/` con tests
3. reemplazar `record_practice_session` por un pipeline de eventos + estado

Cuando eso exista, el resto deja de ser maquillaje y empieza a ser producto premium de verdad.
