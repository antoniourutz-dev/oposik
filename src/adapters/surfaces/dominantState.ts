import type {
  PracticeCategoryRiskSummary,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeSessionSummary,
} from '../../practiceTypes';
import type { SurfaceDominantState } from './surfaceTypes';

const daysSinceIsoDate = (iso: string | null | undefined, reference: Date) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((ref.getTime() - dd.getTime()) / 86_400_000));
};

export function resolveDominantState(input: {
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
  recentSessions?: PracticeSessionSummary[] | null;
  profile?: PracticeProfile | null;
  streakDays?: number | null;
  referenceDate?: Date;
}): SurfaceDominantState {
  const {
    learningDashboardV2,
    pressureInsightsV2,
    weakCategories,
    profile,
    streakDays,
    referenceDate = new Date(),
  } = input;

  const backlogOverdueCount = learningDashboardV2?.backlogOverdueCount ?? 0;
  if (backlogOverdueCount > 0) return 'backlog';

  const topRisk = (weakCategories ?? [])[0];
  const excessRisk = topRisk?.excessRisk ?? null;
  if (typeof excessRisk === 'number' && Number.isFinite(excessRisk) && excessRisk >= 0.12) return 'errors';

  const gap = pressureInsightsV2?.pressureGapRaw ?? null;
  if (typeof gap === 'number' && Number.isFinite(gap) && gap >= 0.12) return 'pressure';

  const daysSince = daysSinceIsoDate(profile?.lastStudiedAt ?? null, referenceDate);
  const s = typeof streakDays === 'number' ? streakDays : null;
  if ((daysSince != null && daysSince >= 2) || (s != null && s <= 0)) return 'recovery';

  const retention = learningDashboardV2?.retentionSeenRate ?? null;
  if (typeof retention === 'number' && Number.isFinite(retention) && retention > 0 && retention < 0.55)
    return 'memory';

  const acc = learningDashboardV2?.observedAccuracyRate ?? null;
  if (typeof acc === 'number' && Number.isFinite(acc) && acc >= 0.75 && (s ?? 0) >= 3) return 'growth';

  return 'gray_zone';
}

