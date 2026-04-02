import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type { PracticeQuestionScopeFilter } from '../../practiceTypes';
import type { SurfaceDominantState } from '../surfaces/surfaceTypes';

export type CoachTelemetrySurface =
  | 'home'
  | 'test'
  | 'review'
  | 'stats'
  | 'session_end'
  | 'catalog_review';

export type CoachDecisionTelemetryEvent = {
  kind: 'coach_decision';
  timestamp: string;
  surface: CoachTelemetrySurface;
  dominantState: SurfaceDominantState;
  /** Decisión estructurada del motor (`planV2.primaryAction`). */
  primaryAction: CoachPlanV2['primaryAction'];
  /** Texto del CTA mostrado en la superficie (p. ej. hero en Home), si aplica. */
  visibleCta?: string;
  tone: CoachPlanV2['tone'];
  /** 0–1 intensidad narrativa aproximada */
  intensity: number;
  urgency: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  reasons: string[];
  decisionMeta: {
    grayZoneTriggered: boolean;
    backlogPresent: boolean;
    pressurePresent: boolean;
    sessionPaused: boolean;
    simulacro: boolean;
    questionScope?: PracticeQuestionScopeFilter;
  };
};

export type CoachEffectTelemetryEvent = {
  kind: 'coach_effect';
  timestamp: string;
  surface: CoachTelemetrySurface;
  dominantState: SurfaceDominantState;
  ctaShown: string;
  ctaPressed: string;
  startedSession: boolean;
  completedSession: boolean;
  repeatedBlock: boolean;
  returnedHome: boolean;
  followedSuggestedPath: boolean;
  meta?: Record<string, string | number | boolean | null>;
};
