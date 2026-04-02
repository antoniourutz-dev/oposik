import type { SurfaceDominantState } from '../surfaces/surfaceTypes';
import type { CoachEffectTelemetryEvent, CoachTelemetrySurface } from './coachTelemetryTypes';

export type BuildCoachEffectInput = {
  surface: CoachTelemetrySurface;
  dominantState: SurfaceDominantState;
  ctaShown: string;
  ctaPressed: string;
  startedSession: boolean;
  completedSession: boolean;
  repeatedBlock: boolean;
  returnedHome: boolean;
  followedSuggestedPath: boolean;
  meta?: CoachEffectTelemetryEvent['meta'];
};

export function buildCoachEffectTelemetryEvent(input: BuildCoachEffectInput): CoachEffectTelemetryEvent {
  return {
    kind: 'coach_effect',
    timestamp: new Date().toISOString(),
    surface: input.surface,
    dominantState: input.dominantState,
    ctaShown: input.ctaShown,
    ctaPressed: input.ctaPressed,
    startedSession: input.startedSession,
    completedSession: input.completedSession,
    repeatedBlock: input.repeatedBlock,
    returnedHome: input.returnedHome,
    followedSuggestedPath: input.followedSuggestedPath,
    meta: input.meta ? { ...input.meta } : undefined,
  };
}
