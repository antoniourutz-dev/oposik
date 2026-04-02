# Coach / Stats — Source of Truth (Governance)

Documento interno de **gobernanza de nombres** y **fuentes de verdad** para evitar duplicar variables, métricas y conceptos.

## 1. Nombres oficiales del proyecto

Estos nombres son el **lenguaje base** del proyecto. No crear equivalentes paralelos.

- **`CoachPlanV2`**: contrato estructurado del motor (acción/tono/intensidad/duración/urgencia/confianza/meta/debug).
- **`CoachPlanV2.primaryAction`**: acción principal decidida por el motor (unión cerrada).
- **`CoachPlanV2.tone`**: tono v2 del motor (unión cerrada).
- **`CoachPlanV2.intensity`**: intensidad recomendada (`low|medium|high`).
- **`CoachPlanV2.duration`**: duración recomendada (`short|normal|long`).
- **`CoachPlanV2.urgency`**: urgencia agregada (`low|medium|high`).
- **`CoachPlanV2.confidence`**: confianza numérica (0..1) de la decisión.
- **`CoachPlanV2.reasons`**: razones auditables (strings) producidas por el motor.
- **`CoachPlanV2.decisionMeta`**: metadatos de decisión (gray zone, safety keys, defaults, margins, completeness).
- **`PracticeLearningDashboardV2`**: dashboard v2 tipado para métricas agregadas (readiness v2 + lawBreakdown).
- **`PracticePressureInsightsV2`**: pressure v2 tipado (gap raw, Ns, confidenceFlag, sampleOk, etc.).
- **`CoachTwoLineMessage`**: formato estándar de copy visible del coach (`line1`, `line2`, `text`).
- **`ActivePracticeSession` / `activeSession`**: sesión activa en runtime (contrato de sesión).
- **`PracticeView` / `view`**: estado de pantalla del flujo (`home|quiz|review|catalog_review`).
- **`CloudPracticeState.recentSessions`**: fuente de sesiones recientes para coach/stats/racha.
- **`PracticeProfile.lastStudiedAt`**: última actividad del perfil (dato crudo tipado).

## 2. Fuentes de verdad por área

### Motor

- **Fuente de verdad**: `src/domain/learningEngine/coachV2.ts`
  - `buildCoachPlanV2()` → `CoachPlanV2`
  - `buildPracticeCoachPlanV2Bundle()` → `{ coachPlan: PracticeCoachPlan, planV2: CoachPlanV2 }`
- **Gray zone**: `CoachPlanV2.decisionMeta.grayZoneTriggered` (+ `decisionMargin`)

### Dashboards

- **V2 (preferente)**: `PracticeLearningDashboardV2` (mapeado desde RPC `get_readiness_dashboard_v2`)
  - Mapper: `src/services/practiceCloudMappers.ts` → `mapLearningDashboardV2`
  - Fetch: `src/services/practiceCloudApi.ts` → `getMyLearningDashboardV2`
- **V1 (legacy)**: `PracticeLearningDashboard` (mapeado desde RPC `get_readiness_dashboard`)
  - Mapper: `mapLearningDashboard`
  - Fetch: `getMyPracticeState`

### Pressure

- **V2 (preferente)**: `PracticePressureInsightsV2` (RPC `get_pressure_dashboard_v2`)
  - Mapper: `mapPressureInsightsV2`
  - Fetch: `getMyPressureDashboardV2`
- **V1 (legacy)**: `PracticePressureInsights` (RPC `get_pressure_dashboard`)
  - Mapper: `mapPressureInsights`
  - Fetch: `getMyPracticeState`

### Copy visible

- **Fuente de verdad**: `src/domain/learningEngine/coachCopy.ts`
  - `toCoachTwoLineMessage(...)` → `CoachTwoLineMessage`
- Entradas permitidas: `focusMessage` (dashboards), `reasons` y `summary` (coachPlan).

### Sesión activa

- **Fuente de verdad**: `src/hooks/usePracticeSessionLifecycle.ts`
  - Estado: `activeSession`, `answers`, `currentQuestionIndex`, `view`
  - Snapshot persistido: `StoredActiveSession` (interno)

### Flujo UI

- **Fuente de verdad**: `PracticeView` (`src/hooks/usePracticeSessionFlow.ts`) y su consumo en `src/PracticeAppShell.tsx`.
- Layout adaptativo (solo aquí): `shellBackgroundClass`, `showDesktopRail`, `shouldHideDockOnMobile`, `mainTopPadding`.

## 3. Nombres prohibidos o desaconsejados

No crear estos nombres. Reutilizar el nombre oficial.

| No crear | Reutilizar |
|---|---|
| `mainAction`, `coreAction` | `CoachPlanV2.primaryAction` |
| `coachTone`, `toneLabel` | `CoachPlanV2.tone` |
| `sessionIntensity`, `coachIntensity` | `CoachPlanV2.intensity` |
| `sessionDuration`, `coachDuration` | `CoachPlanV2.duration` |
| `urgencyLevel`, `priorityLevel` | `CoachPlanV2.urgency` |
| `confidenceScore`, `coachConfidence` | `CoachPlanV2.confidence` |
| `why`, `because`, `reasonList` | `CoachPlanV2.reasons` |
| `grayZone`, `isUnclearDecision` | `CoachPlanV2.decisionMeta.grayZoneTriggered` (+ `decisionMargin`) |
| `overdueBacklog`, `dangerBacklog`, `high_backlog` | `PracticeLearningDashboardV2.backlogOverdueCount` (fallback: `PracticeLearningDashboard.overdueCount`) |
| `realAccuracy`, `trueAccuracy`, `accuracyGlobal` | `PracticeLearningDashboardV2.observedAccuracyRate` |
| `pressureDelta`, `gapPressure` | `PracticePressureInsightsV2.pressureGapRaw` (fallback: `PracticePressureInsights.pressureGap`) |
| `streak`, `streakCount`, `daysStreak` | `streakDays` (no crear variantes) |
| `activeQuiz`, `quizSession` | `activeSession` (`ActivePracticeSession`) |
| `currentScreen`, `route` (custom) | `view` (`PracticeView`) |
| `isOverlayMode`, `fullScreenMode` | derivar desde `view` en `PracticeAppShell.tsx` |
| `riskFlags` | **no existe contrato formal** (usar `decisionMeta.safetyTriggeredKeys` / `debug.safety` solo debug) |

## 4. Reglas operativas

1. Si el concepto existe en `CoachPlanV2`, **no** recrearlo en UI con otro nombre.
2. Para métricas agregadas, priorizar `PracticeLearningDashboardV2` antes que derivar desde `recentSessions`.
3. Backlog vencido: usar `PracticeLearningDashboardV2.backlogOverdueCount`; solo fallback a `PracticeLearningDashboard.overdueCount`.
4. Presión: usar `PracticePressureInsightsV2.pressureGapRaw`; solo fallback a `PracticePressureInsights.pressureGap`.
5. Gray zone se representa **solo** con `decisionMeta.grayZoneTriggered` (+ `decisionMargin`).
6. Copy visible del coach en UI debe salir de `toCoachTwoLineMessage(...)` y ser `CoachTwoLineMessage`.
7. No ampliar contratos legacy (`PracticeCoachPlan`, `PracticeLearningDashboard`, `PracticePressureInsights`).
8. La fuente de verdad del flujo es `view: PracticeView`; overlays/layout se derivan en `PracticeAppShell.tsx`.
9. No calcular `streakDays` en un tercer sitio: reutilizar uno existente hasta unificar.
10. Snapshots deben usar nombres existentes (`PracticeAccountSnapshot`, `PracticeScopeSnapshot`, `PracticeBootstrap`, `StoredActiveSession`).

## 5. Legacy vs núcleo

| Contrato | Clasificación | Puede seguir usándose | Puede ampliarse |
|---|---|---:|---:|
| `CoachPlanV2` | Núcleo actual | Sí | Sí |
| `PracticeCoachPlan` | Compatibilidad legacy | Sí | **No** |
| `CoachTwoLineMessage` | Núcleo (copy visible) | Sí | Sí (solo en `coachCopy.ts`) |
| `PracticeLearningDashboardV2` | Núcleo actual | Sí | Sí |
| `PracticeLearningDashboard` | Legacy | Sí | **No** |
| `PracticePressureInsightsV2` | Núcleo actual | Sí | Sí |
| `PracticePressureInsights` | Legacy | Sí | **No** |
| `coachPlanV2ForDebug` | Solo debug | Sí (DEV) | **No** |
| `CoachPlanV2.decisionMeta` | Núcleo (meta decisión) | Sí | Sí |
| `CoachPlanV2.debug` | Solo debug | Sí (DEV) | Sí (debug) |

