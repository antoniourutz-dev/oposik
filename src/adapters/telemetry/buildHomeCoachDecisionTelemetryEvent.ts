import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type {
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeQuestionScopeFilter,
} from '../../practiceTypes';
import type { SurfaceDominantState } from '../surfaces/surfaceTypes';
import { buildCoachDecisionTelemetryEvent } from './buildCoachDecisionTelemetryEvent';
import type { CoachDecisionTelemetryEvent } from './coachTelemetryTypes';

/** Alineado con `resolveDominantState` (presión como señal dominante). */
const PRESSURE_GAP_THRESHOLD = 0.12;

const intensityTo01 = (i: CoachPlanV2['intensity']): number => {
  if (i === 'low') return 0.33;
  if (i === 'medium') return 0.66;
  return 1;
};

const confidence01ToBand = (c: number): CoachDecisionTelemetryEvent['confidence'] => {
  if (!Number.isFinite(c)) return 'medium';
  if (c < 0.38) return 'low';
  if (c < 0.72) return 'medium';
  return 'high';
};

export type BuildHomeCoachDecisionTelemetryInput = {
  planV2: CoachPlanV2;
  dominantState: SurfaceDominantState;
  /** Texto del CTA del hero (misma línea que ve el usuario). */
  visibleCta: string;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  sessionPaused: boolean;
  questionScope: PracticeQuestionScopeFilter;
};

/**
 * Decisión visible en Home: solo consume `planV2`, estado superficial y señales ya expuestas en props.
 * No usa `planV2.debug`.
 */
export function buildHomeCoachDecisionTelemetryEvent(
  input: BuildHomeCoachDecisionTelemetryInput,
): CoachDecisionTelemetryEvent {
  const {
    planV2,
    dominantState,
    visibleCta,
    learningDashboardV2,
    pressureInsightsV2,
    sessionPaused,
    questionScope,
  } = input;

  const backlogPresent = (learningDashboardV2?.backlogOverdueCount ?? 0) > 0;
  const gap = pressureInsightsV2?.pressureGapRaw ?? null;
  const pressurePresent =
    typeof gap === 'number' && Number.isFinite(gap) && gap >= PRESSURE_GAP_THRESHOLD;

  const dm = planV2.decisionMeta;
  const grayZoneTriggered = dm?.grayZoneTriggered ?? false;

  return buildCoachDecisionTelemetryEvent({
    surface: 'home',
    dominantState,
    primaryAction: planV2.primaryAction,
    visibleCta,
    tone: planV2.tone,
    intensity: intensityTo01(planV2.intensity),
    urgency: planV2.urgency,
    confidence: confidence01ToBand(planV2.confidence),
    reasons: [...planV2.reasons],
    decisionMeta: {
      grayZoneTriggered,
      backlogPresent,
      pressurePresent,
      sessionPaused,
      simulacro: planV2.primaryAction === 'simulacro',
      questionScope,
    },
  });
}
