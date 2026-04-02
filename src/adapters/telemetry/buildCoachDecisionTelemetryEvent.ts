import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type { SurfaceDominantState } from '../surfaces/surfaceTypes';
import type { CoachDecisionTelemetryEvent, CoachTelemetrySurface } from './coachTelemetryTypes';

export type BuildCoachDecisionInput = {
  surface: CoachTelemetrySurface;
  dominantState: SurfaceDominantState;
  primaryAction: CoachPlanV2['primaryAction'];
  visibleCta?: string;
  tone: CoachPlanV2['tone'];
  intensity: number;
  urgency: CoachDecisionTelemetryEvent['urgency'];
  confidence: CoachDecisionTelemetryEvent['confidence'];
  reasons: string[];
  decisionMeta: CoachDecisionTelemetryEvent['decisionMeta'];
};

export function buildCoachDecisionTelemetryEvent(input: BuildCoachDecisionInput): CoachDecisionTelemetryEvent {
  return {
    kind: 'coach_decision',
    timestamp: new Date().toISOString(),
    surface: input.surface,
    dominantState: input.dominantState,
    primaryAction: input.primaryAction,
    ...(input.visibleCta !== undefined ? { visibleCta: input.visibleCta } : {}),
    tone: input.tone,
    intensity: Math.max(0, Math.min(1, input.intensity)),
    urgency: input.urgency,
    confidence: input.confidence,
    reasons: [...input.reasons],
    decisionMeta: { ...input.decisionMeta },
  };
}
