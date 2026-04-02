import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';

export type SurfaceDominantState =
  | 'backlog'
  | 'errors'
  | 'pressure'
  | 'recovery'
  | 'memory'
  | 'growth'
  | 'gray_zone';

export type SurfaceTension = 'low' | 'medium' | 'high';

export type SurfaceExperience = {
  dominantState: SurfaceDominantState;
  tone: CoachPlanV2['tone'];
  tension: SurfaceTension;
  primaryCta: string;
  secondaryCta?: string;
  headline: string;
  subheadline?: string;
  supportLabel?: string;
  uiFlags: {
    showAlternative: boolean;
    showPausedSession: boolean;
    showStatsJustification: boolean;
    reduceChoices: boolean;
    compactFeedback: boolean;
    highlightPressure: boolean;
  };
};

