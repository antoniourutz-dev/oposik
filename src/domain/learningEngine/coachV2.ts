import type {
  PracticeCoachPlan,
  PracticeCoachPlanChip,
  PracticeExamTarget,
  PracticeLearningDashboard,
  PracticeLearningDashboardV2,
  PracticePressureInsights,
  PracticePressureInsightsV2,
  PracticeSessionSummary,
} from '../../practiceTypes';

export type CoachPlanV2 = {
  primaryAction: 'review' | 'standard' | 'simulacro' | 'anti_trap' | 'recovery' | 'push';
  intensity: 'low' | 'medium' | 'high';
  duration: 'short' | 'normal' | 'long';
  tone: 'rescue' | 'protect' | 'build' | 'push' | 'maintain';
  urgency: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  reasons: string[];
  evidence: {
    dominantProblem: string;
    supportingSignals: string[];
  };
  sessionSpec: {
    targetQuestions?: number;
    targetMinutes?: number;
    allowedDifficulty?: 'easy_only' | 'mixed' | 'hard_bias';
    focusScope?: 'weak_only' | 'mixed' | 'pressure' | 'full_exam';
  };
  decisionMeta?: {
    actionBeforeGrayZone?: string | null;
    actionAfterGrayZone: string;
    grayZoneTriggered: boolean;
    aggressiveActionDowngraded: boolean;
    safetyTriggeredCount: number;
    safetyTriggeredKeys: string[];
    defaultsUsedCount: number;
    defaultsUsed: string[];
    decisionMargin: number | null;
    signalCompleteness: number;
  };
  debug?: {
    signals: Record<string, unknown>;
    scores: Record<string, unknown>;
    safety: Record<string, unknown>;
    candidates: Array<{ kind: CoachPlanV2['primaryAction']; score: number }>;
    chosen: CoachPlanV2['primaryAction'];
    decisionMargin: number;
    isGrayZone: boolean;
    defaultsUsed: string[];
  };
};

export type CoachDecisionLog = {
  primaryAction: string;
  intensity: string;
  duration: string;
  tone: string;
  urgency: string;
  confidence: number;
  decisionMargin: number | null;
  grayZoneTriggered: boolean;
  aggressiveActionDowngraded: boolean;
  safetyTriggeredKeys: string[];
  defaultsUsed: string[];
  signalCompleteness: number;
};

type BuildCoachPlanV2Input = {
  learningDashboard: PracticeLearningDashboard | null;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsights: PracticePressureInsights | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  examTarget: PracticeExamTarget | null;
  recentSessions: PracticeSessionSummary[];
  recommendedBatchNumber: number;
  totalBatches: number;
  batchSize: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export const DECISION_MARGIN_GRAY_ZONE_THRESHOLD = 0.06;

const createDefaultRecorder = () => {
  const set = new Set<string>();
  const list: string[] = [];
  return {
    add: (key: string) => {
      if (!key) return;
      if (set.has(key)) return;
      set.add(key);
      list.push(key);
    },
    values: () => [...list],
    count: () => list.length,
  };
};

const getDaysToExam = (examDate: string | null | undefined, referenceDate: Date) => {
  if (!examDate) return null;
  const exam = new Date(examDate);
  if (Number.isNaN(exam.getTime())) return null;
  const diffMs = exam.getTime() - referenceDate.getTime();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
};

const getExamChip = (
  examTarget: PracticeExamTarget | null,
  referenceDate: Date,
): PracticeCoachPlanChip | null => {
  const daysToExam = getDaysToExam(examTarget?.examDate, referenceDate);
  if (daysToExam === null) return null;
  if (daysToExam === 0) return { label: 'Examen', value: 'Hoy' };
  return { label: 'Examen', value: `${daysToExam}d` };
};

const formatPercent = (value: number | null | undefined) =>
  `${Math.round(clamp01(value ?? 0) * 100)}%`;

const normalize100 = (v: number, max: number) => {
  if (!Number.isFinite(v) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (v / max) * 100));
};

const toSessionTimestamp = (s: PracticeSessionSummary) => {
  const raw = s.finishedAt || s.startedAt;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
};

const sortSessionsMostRecentFirst = (recentSessions: PracticeSessionSummary[]) =>
  [...recentSessions].sort((a, b) => toSessionTimestamp(b) - toSessionTimestamp(a));

const computeAccuracyRecent = (recentSessions: PracticeSessionSummary[]) => {
  const windowSessions = sortSessionsMostRecentFirst(recentSessions).slice(0, 3);
  const totals = windowSessions.reduce(
    (acc, s) => {
      acc.score += Number(s.score ?? 0) || 0;
      acc.total += Number(s.total ?? 0) || 0;
      return acc;
    },
    { score: 0, total: 0 },
  );
  if (totals.total <= 0) return null;
  return clamp01(totals.score / totals.total);
};

const computeDaysSinceLastSession = (recentSessions: PracticeSessionSummary[], referenceDate: Date) => {
  const last = sortSessionsMostRecentFirst(recentSessions)[0];
  const raw = last?.finishedAt || last?.startedAt;
  if (!raw) return null;
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return null;
  const diffMs = referenceDate.getTime() - t.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
};

const getSafetyTriggeredKeys = (safety: {
  forbidHighIntensity: boolean;
  forbidSimulacro: boolean;
  preferShort: boolean;
  avoidPressureFirst: boolean;
}) => {
  const keys: string[] = [];
  if (safety.forbidSimulacro) keys.push('forbidSimulacro');
  if (safety.avoidPressureFirst) keys.push('avoidPressureFirst');
  if (safety.forbidHighIntensity) keys.push('capHighIntensityForFatigue');
  if (safety.preferShort) keys.push('preferShortSession');
  return keys;
};

const estimateConfidence = ({
  signalCompleteness,
  decisionMargin,
  defaultsUsedCount,
  safetyTriggeredCount,
  isGrayZone,
}: {
  signalCompleteness: number; // 0..1
  decisionMargin: number; // 0..1-ish
  defaultsUsedCount: number;
  safetyTriggeredCount: number;
  isGrayZone: boolean;
}) => {
  const completeness = clamp01(signalCompleteness);
  const margin = clamp01(decisionMargin);

  // Base: depende de tener datos; luego sube con claridad de decisión.
  let c = 0.22 + 0.58 * completeness + 0.35 * margin;
  c -= 0.07 * defaultsUsedCount;
  c -= 0.05 * safetyTriggeredCount;
  if (isGrayZone) c -= 0.14;

  // Si la decisión es muy poco clara, cap para evitar "arrogancia".
  if (margin < 0.03) c = Math.min(c, 0.46);
  if (completeness < 0.35) c = Math.min(c, 0.52);

  return clamp01(c);
};

const buildReasons = ({
  primaryAction,
  signals,
  scores,
  safety,
  safetyTriggeredKeys,
  isGrayZone,
}: {
  primaryAction: CoachPlanV2['primaryAction'];
  signals: {
    accuracyRecent: number | null;
    backlogOverdue: number;
    backlogPressure: number; // 0..100
    daysSinceLastSession: number | null;
    pressureGap: number | null;
  };
  scores: {
    recoveryNeed: number;
    consolidationNeed: number;
    pressureNeed: number;
    growthOpportunity: number;
  };
  safety: {
    forbidHighIntensity: boolean;
    forbidSimulacro: boolean;
    preferShort: boolean;
    avoidPressureFirst: boolean;
  };
  safetyTriggeredKeys: string[];
  isGrayZone: boolean;
}) => {
  const reasons: string[] = [];

  if (isGrayZone) {
    reasons.push('Se prioriza una opción conservadora por baja claridad entre señales.');
  }

  if (safety.avoidPressureFirst) {
    reasons.push('La base aún no es estable para un simulacro exigente.');
  }

  if (signals.backlogPressure >= 55 || signals.backlogOverdue >= 10) {
    reasons.push('Hay backlog pendiente relevante y conviene consolidar antes de apretar.');
  }

  if (signals.daysSinceLastSession !== null && signals.daysSinceLastSession >= 3) {
    reasons.push('Tras varios días sin sesión, conviene reiniciar con una intervención corta.');
  }

  if (signals.pressureGap !== null && signals.pressureGap >= 0.12 && primaryAction !== 'simulacro') {
    reasons.push('La brecha bajo presión está presente, pero hoy conviene estabilizar primero.');
  }

  if (signals.accuracyRecent !== null && signals.accuracyRecent < 0.55) {
    reasons.push('El acierto reciente es bajo; conviene reducir ruido antes de subir exigencia.');
  }

  if (safety.forbidHighIntensity) {
    reasons.push('Se limita la intensidad por riesgo de fatiga.');
  }

  // Asegurar al menos 2 razones, siempre auditables (no copy decorativo).
  if (reasons.length < 2) {
    switch (primaryAction) {
      case 'simulacro':
        reasons.push('La base es suficiente y conviene medir transferencia bajo presión.');
        break;
      case 'push':
        reasons.push('Hay margen para aumentar carga sin disparar fatiga.');
        break;
      case 'review':
        reasons.push('Consolidar ahora aumenta estabilidad y reduce deuda.');
        break;
      case 'recovery':
        reasons.push('Recuperar tracción hoy protege continuidad.');
        break;
      case 'anti_trap':
        reasons.push('El problema parece de lectura/patrón, no de volumen.');
        break;
      default:
        reasons.push('No hay una señal dominante; conviene continuidad sin fricción.');
    }
  }

  // Normalizar a 2 líneas (máxima legibilidad y consistencia con el sistema).
  const unique = Array.from(new Set(reasons));
  return unique.slice(0, 2);
};

export function toCoachDecisionLog(plan: CoachPlanV2): CoachDecisionLog {
  const meta = plan.decisionMeta;
  return {
    primaryAction: plan.primaryAction,
    intensity: plan.intensity,
    duration: plan.duration,
    tone: plan.tone,
    urgency: plan.urgency,
    confidence: plan.confidence,
    decisionMargin: meta?.decisionMargin ?? null,
    grayZoneTriggered: meta?.grayZoneTriggered ?? Boolean(plan.debug?.isGrayZone),
    aggressiveActionDowngraded: meta?.aggressiveActionDowngraded ?? false,
    safetyTriggeredKeys: meta?.safetyTriggeredKeys ?? [],
    defaultsUsed: meta?.defaultsUsed ?? plan.debug?.defaultsUsed ?? [],
    signalCompleteness: meta?.signalCompleteness ?? 0,
  };
}

const buildSessionSpec = (
  primaryAction: CoachPlanV2['primaryAction'],
  intensity: CoachPlanV2['intensity'],
  duration: CoachPlanV2['duration'],
): CoachPlanV2['sessionSpec'] => {
  // Basado en tu spec (MVP). Ajustes por intensidad/duración son deliberadamente conservadores.
  const baseByAction: Record<CoachPlanV2['primaryAction'], CoachPlanV2['sessionSpec']> = {
    recovery: { targetMinutes: 5, targetQuestions: 6, allowedDifficulty: 'easy_only', focusScope: 'weak_only' },
    review: { targetMinutes: 10, targetQuestions: 12, allowedDifficulty: 'mixed', focusScope: 'weak_only' },
    anti_trap: { targetMinutes: 8, targetQuestions: 8, allowedDifficulty: 'mixed', focusScope: 'weak_only' },
    standard: { targetMinutes: 12, targetQuestions: 15, allowedDifficulty: 'mixed', focusScope: 'mixed' },
    simulacro: { targetMinutes: 25, targetQuestions: 30, allowedDifficulty: 'hard_bias', focusScope: 'full_exam' },
    push: { targetMinutes: 18, targetQuestions: 22, allowedDifficulty: 'hard_bias', focusScope: 'mixed' },
  };

  const base = { ...baseByAction[primaryAction] };
  const durationMult = duration === 'short' ? 0.7 : duration === 'long' ? 1.25 : 1;
  const intensityMult = intensity === 'low' ? 0.85 : intensity === 'high' ? 1.1 : 1;
  const mult = durationMult * intensityMult;

  if (typeof base.targetMinutes === 'number') base.targetMinutes = Math.round(base.targetMinutes * mult);
  if (typeof base.targetQuestions === 'number') base.targetQuestions = Math.round(base.targetQuestions * mult);
  return base;
};

export const buildCoachPlanV2 = (
  input: BuildCoachPlanV2Input,
  referenceDate = new Date(),
): CoachPlanV2 => {
  const {
    learningDashboard,
    learningDashboardV2,
    pressureInsights,
    pressureInsightsV2,
    examTarget,
    recentSessions,
  } = input;

  // Señales disponibles hoy (MVP real con datos actuales).
  const accuracyRecent = computeAccuracyRecent(recentSessions);
  const daysSinceLastSession = computeDaysSinceLastSession(recentSessions, referenceDate);

  const defaults = createDefaultRecorder();
  const readinessScore = normalize100(learningDashboard?.readiness ?? 0, 1); // 0-100
  const backlogOverdue =
    (learningDashboardV2?.backlogOverdueCount ??
      learningDashboard?.overdueCount ??
      0) || 0;
  const dailyReviewCapacity = learningDashboard?.dailyReviewCapacity ?? 35;
  const backlogPressure = Math.max(
    0,
    Math.min(100, normalize100(backlogOverdue, Math.max(1, dailyReviewCapacity * 2))),
  );

  const pressureGap =
    pressureInsightsV2?.pressureGapRaw ?? pressureInsights?.pressureGap ?? null;
  const fatigue = pressureInsightsV2?.avgSimulacroFatigue ?? pressureInsights?.avgSimulacroFatigue ?? null;

  const examDays = getDaysToExam(examTarget?.examDate ?? learningDashboard?.examDate, referenceDate);
  const examProximity = examDays === null ? 0 : Math.max(0, Math.min(1, (60 - examDays) / 60)); // 0..1 (más cerca => mayor)

  // Inferencias conservadoras (sin Behavioral Memory completo aún).
  const inactivitySignal =
    daysSinceLastSession === null ? 0 : daysSinceLastSession >= 3 ? 1 : daysSinceLastSession / 3;
  const fatigueRisk = fatigue === null ? 0.35 : clamp01(fatigue); // 0..1
  if (fatigue === null) defaults.add('fatigueRisk:baseline');
  const frustrationRisk = clamp01(
    (accuracyRecent !== null ? (0.65 - accuracyRecent) : 0.1) + (pressureGap ?? 0) * 0.6 + fatigueRisk * 0.4,
  );
  if (accuracyRecent === null) defaults.add('accuracyRecent:none');
  if (daysSinceLastSession === null) defaults.add('daysSinceLastSession:none');
  if (pressureGap === null || pressureGap === undefined) defaults.add('pressureGap:none');
  if (examDays === null) defaults.add('examProximity:none');
  if (!learningDashboard) defaults.add('learningDashboard:none');
  if (!learningDashboardV2) defaults.add('learningDashboardV2:none');

  const recoveryNeed = clamp01(0.45 * inactivitySignal + 0.35 * fatigueRisk + 0.2 * frustrationRisk);
  const consolidationNeed = clamp01(0.55 * (backlogPressure / 100) + 0.45 * (accuracyRecent !== null ? 1 - accuracyRecent : 0.3));
  const pressureNeed = clamp01(0.65 * (pressureGap ?? 0) + 0.35 * examProximity);
  const growthOpportunity = clamp01(
    0.45 * (readinessScore / 100) +
      0.35 * (accuracyRecent ?? 0.55) -
      0.2 * fatigueRisk,
  );

  // Safety rules (MVP).
  const safety = {
    forbidHighIntensity: fatigueRisk > 0.75,
    forbidSimulacro: (daysSinceLastSession ?? 0) >= 3 && examProximity < 0.85,
    preferShort: recoveryNeed > 0.6 || fatigueRisk > 0.7,
    avoidPressureFirst: (pressureGap ?? 0) > 0.14 && (accuracyRecent ?? 0.6) < 0.55,
  };
  const safetyTriggeredKeys = getSafetyTriggeredKeys(safety);

  // Dominant action selection.
  type Candidate = { kind: CoachPlanV2['primaryAction']; score: number };
  const candidates: Candidate[] = [
    { kind: 'recovery', score: recoveryNeed },
    { kind: 'review', score: consolidationNeed },
    { kind: 'anti_trap', score: (pressureGap ?? 0) * 0.6 + (accuracyRecent ?? 0.6) * 0.2 },
    { kind: 'simulacro', score: pressureNeed },
    { kind: 'push', score: growthOpportunity },
    { kind: 'standard', score: 0.35 },
  ];

  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  const top1 = ordered[0] ?? { kind: 'standard' as const, score: 0.35 };
  const top2 = ordered[1] ?? { kind: 'standard' as const, score: 0.35 };
  const decisionMargin = clamp01(top1.score - top2.score);
  const isGrayZone = decisionMargin < DECISION_MARGIN_GRAY_ZONE_THRESHOLD;

  const actionBeforeGrayZone: CoachPlanV2['primaryAction'] = top1.kind;
  let primaryAction = actionBeforeGrayZone;

  if (primaryAction === 'simulacro' && safety.forbidSimulacro) primaryAction = 'standard';
  if (primaryAction === 'simulacro' && safety.avoidPressureFirst) primaryAction = 'review';

  // Tie-break conservador en zona gris: evita acciones agresivas.
  let aggressiveActionDowngraded = false;
  if (isGrayZone && (primaryAction === 'simulacro' || primaryAction === 'push')) {
    primaryAction = consolidationNeed >= recoveryNeed ? 'review' : 'standard';
    aggressiveActionDowngraded = true;
  }

  // Intensity.
  let intensity: CoachPlanV2['intensity'] = 'medium';
  if (safety.forbidHighIntensity || recoveryNeed > 0.6) intensity = 'low';
  else if (examProximity > 0.7 && growthOpportunity > 0.6 && fatigueRisk < 0.35) intensity = 'high';

  // Duration.
  let duration: CoachPlanV2['duration'] = 'normal';
  if (safety.preferShort) duration = 'short';
  else if (primaryAction === 'simulacro' && intensity !== 'low' && fatigueRisk < 0.45) duration = 'long';

  // Tone.
  const tone: CoachPlanV2['tone'] =
    primaryAction === 'recovery'
      ? 'rescue'
      : primaryAction === 'review' || primaryAction === 'anti_trap'
        ? 'build'
        : primaryAction === 'push'
          ? 'push'
          : primaryAction === 'simulacro'
            ? 'maintain'
            : 'maintain';

  // Urgency (simplificado): backlog + proximidad examen + inactividad.
  const urgencyRaw = clamp01(0.45 * (backlogPressure / 100) + 0.35 * examProximity + 0.2 * inactivitySignal);
  const urgency: CoachPlanV2['urgency'] = urgencyRaw > 0.72 ? 'high' : urgencyRaw > 0.42 ? 'medium' : 'low';

  const signalCount =
    Number(accuracyRecent !== null) +
    Number(daysSinceLastSession !== null) +
    Number(pressureGap !== null && pressureGap !== undefined) +
    Number(Boolean(examTarget?.examDate ?? learningDashboard?.examDate)) +
    Number(learningDashboard !== null);
  const signalCompleteness = signalCount / 5;
  const confidence = estimateConfidence({
    signalCompleteness,
    decisionMargin,
    defaultsUsedCount: defaults.count(),
    safetyTriggeredCount: safetyTriggeredKeys.length,
    isGrayZone,
  });

  const dominantProblem =
    primaryAction === 'recovery'
      ? 'Pérdida de tracción'
      : primaryAction === 'review'
        ? 'Base con deuda'
        : primaryAction === 'anti_trap'
          ? 'Errores de lectura/patrón'
          : primaryAction === 'simulacro'
            ? 'Transferencia bajo presión'
            : primaryAction === 'push'
              ? 'Momento fuerte aprovechable'
              : 'Continuidad';

  const supportingSignals: string[] = [];
  if (daysSinceLastSession !== null && daysSinceLastSession > 0) supportingSignals.push(`Última sesión hace ${daysSinceLastSession}d`);
  if (accuracyRecent !== null) supportingSignals.push(`Acierto reciente ${formatPercent(accuracyRecent)}`);
  if (pressureGap !== null && pressureGap !== undefined) supportingSignals.push(`Brecha presión ${Math.round(Math.abs(pressureGap) * 100)} pts`);
  if (backlogOverdue > 0) supportingSignals.push(`Repasos urgentes ${backlogOverdue}`);

  const reasons = buildReasons({
    primaryAction,
    signals: {
      accuracyRecent,
      backlogOverdue,
      backlogPressure,
      daysSinceLastSession,
      pressureGap: pressureGap ?? null,
    },
    scores: {
      recoveryNeed,
      consolidationNeed,
      pressureNeed,
      growthOpportunity,
    },
    safety,
    safetyTriggeredKeys,
    isGrayZone,
  });

  const defaultsUsed = defaults.values();

  return {
    primaryAction,
    intensity,
    duration,
    tone,
    urgency,
    confidence,
    reasons,
    evidence: {
      dominantProblem,
      supportingSignals: supportingSignals.slice(0, 4),
    },
    sessionSpec: buildSessionSpec(primaryAction, intensity, duration),
    decisionMeta: {
      actionBeforeGrayZone: aggressiveActionDowngraded ? actionBeforeGrayZone : null,
      actionAfterGrayZone: primaryAction,
      grayZoneTriggered: isGrayZone,
      aggressiveActionDowngraded,
      safetyTriggeredCount: safetyTriggeredKeys.length,
      safetyTriggeredKeys,
      defaultsUsedCount: defaultsUsed.length,
      defaultsUsed,
      decisionMargin,
      signalCompleteness,
    },
    debug: {
      signals: {
        accuracyRecent,
        daysSinceLastSession,
        readinessScore,
        backlogOverdue,
        backlogPressure,
        pressureGap: pressureGap ?? null,
        fatigueRisk,
        examProximity,
      },
      scores: {
        recoveryNeed,
        consolidationNeed,
        pressureNeed,
        growthOpportunity,
        urgencyRaw,
      },
      safety: { ...safety, safetyTriggeredKeys },
      candidates,
      chosen: primaryAction,
      decisionMargin,
      isGrayZone,
      defaultsUsed,
    },
  };
};

const toLegacyTone = (tone: CoachPlanV2['tone']): PracticeCoachPlan['tone'] => {
  switch (tone) {
    case 'rescue':
      return 'rescue';
    case 'build':
      return 'build';
    case 'push':
      return 'advance';
    case 'protect':
      return 'maintain';
    default:
      return 'maintain';
  }
};

const toLegacyMode = (primaryAction: CoachPlanV2['primaryAction']): PracticeCoachPlan['mode'] => {
  switch (primaryAction) {
    case 'review':
    case 'recovery':
      return 'mixed';
    case 'anti_trap':
      return 'anti_trap';
    case 'simulacro':
      return 'simulacro';
    case 'push':
      return 'standard';
    default:
      return 'standard';
  }
};

export const buildPracticeCoachPlanV2 = (
  input: BuildCoachPlanV2Input,
  referenceDate = new Date(),
): PracticeCoachPlan => {
  const plan = buildCoachPlanV2(input, referenceDate);
  return adaptCoachPlanV2ToLegacy(plan, input, referenceDate);
};

const adaptCoachPlanV2ToLegacy = (
  plan: CoachPlanV2,
  input: BuildCoachPlanV2Input,
  referenceDate: Date,
): PracticeCoachPlan => {

  const chips: PracticeCoachPlanChip[] = [
    { label: 'Intensidad', value: plan.intensity },
    { label: 'Duración', value: plan.duration },
  ];
  const examChip = getExamChip(input.examTarget, referenceDate);
  if (examChip) chips.push(examChip);

  const mode = toLegacyMode(plan.primaryAction);
  const primaryActionLabel =
    plan.primaryAction === 'simulacro'
      ? 'Lanzar simulacro'
      : plan.primaryAction === 'anti_trap'
        ? 'Entrenar anti-trampas'
        : plan.primaryAction === 'review' || plan.primaryAction === 'recovery'
          ? 'Activar sesión segura'
          : plan.primaryAction === 'push'
            ? `Abrir bloque ${input.recommendedBatchNumber}`
            : `Abrir bloque ${input.recommendedBatchNumber}`;

  const titleByAction: Record<CoachPlanV2['primaryAction'], string> = {
    recovery: 'Recupera ritmo sin castigo',
    review: 'Consolida antes de apretar',
    anti_trap: 'Desactiva trampas de lectura',
    simulacro: 'Mide tu nivel real',
    push: 'Aprovecha el momento',
    standard: 'Sigue una ruta limpia',
  };

  const focusLabel =
    plan.primaryAction === 'recovery'
      ? 'Recuperación'
      : plan.primaryAction === 'review'
        ? 'Consolidación'
        : plan.primaryAction === 'simulacro'
          ? 'Presión'
          : plan.primaryAction === 'anti_trap'
            ? 'Lectura fina'
            : plan.primaryAction === 'push'
              ? 'Empuje'
              : 'Continuidad';

  return {
    mode,
    tone: toLegacyTone(plan.tone),
    eyebrow: 'Coach V2',
    title: titleByAction[plan.primaryAction],
    summary: plan.evidence.dominantProblem,
    primaryActionLabel,
    focusLabel,
    impactLabel: plan.reasons[0] ?? 'Hoy conviene una intervención simple y ejecutable.',
    reasons: plan.reasons,
    chips,
  };
};

export const buildPracticeCoachPlanV2Bundle = (
  input: BuildCoachPlanV2Input,
  referenceDate = new Date(),
): { coachPlan: PracticeCoachPlan; planV2: CoachPlanV2 } => {
  const planV2 = buildCoachPlanV2(input, referenceDate);
  return {
    coachPlan: adaptCoachPlanV2ToLegacy(planV2, input, referenceDate),
    planV2,
  };
};

