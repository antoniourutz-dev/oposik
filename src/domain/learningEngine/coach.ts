import type {
  PracticeCoachPlan,
  PracticeCoachPlanChip,
  PracticeExamTarget,
  PracticeLearningDashboard,
  PracticePressureInsights,
} from '../../practiceTypes';

type BuildPracticeCoachPlanInput = {
  learningDashboard: PracticeLearningDashboard | null;
  pressureInsights: PracticePressureInsights | null;
  examTarget: PracticeExamTarget | null;
  recommendedBatchNumber: number;
  totalBatches: number;
  batchSize: number;
};

const formatPercent = (value: number | null | undefined) =>
  `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`;

const formatPoints = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--';
  return `${Math.round(Math.abs(value) * 100)} pts`;
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

  if (daysToExam === 0) {
    return { label: 'Examen', value: 'Hoy' };
  }

  return { label: 'Examen', value: `${daysToExam}d` };
};

const buildDefaultPlan = (
  {
    recommendedBatchNumber,
    totalBatches,
    batchSize,
    examTarget,
  }: Omit<BuildPracticeCoachPlanInput, 'learningDashboard' | 'pressureInsights'>,
  referenceDate: Date,
): PracticeCoachPlan => {
  const chips: PracticeCoachPlanChip[] = [
    { label: 'Bloque', value: `${recommendedBatchNumber}/${Math.max(1, totalBatches)}` },
    { label: 'Sesion', value: `${batchSize} preguntas` },
  ];
  const examChip = getExamChip(examTarget, referenceDate);
  if (examChip) chips.push(examChip);

  return {
    mode: 'standard',
    tone: 'advance',
    eyebrow: 'Director de estudio',
    title: 'Arranca con una base limpia',
    summary: 'Empieza por un bloque guiado para activar memoria y senal real de progreso.',
    primaryActionLabel: `Abrir bloque ${recommendedBatchNumber}`,
    focusLabel: 'Base inicial',
    impactLabel: 'Vas a activar memoria util sin meter ruido ni mezcla prematura.',
    reasons: [
      'Ahora mismo conviene convertir conocimiento suelto en una primera senal estable.',
      'El objetivo no es correr: es crear una base sobre la que luego si tenga sentido mezclar.',
    ],
    chips,
  };
};

export const buildPracticeCoachPlan = (
  input: BuildPracticeCoachPlanInput,
  referenceDate = new Date(),
): PracticeCoachPlan => {
  const {
    learningDashboard,
    pressureInsights,
    examTarget,
    recommendedBatchNumber,
    totalBatches,
    batchSize,
  } = input;

  if (!learningDashboard) {
    return buildDefaultPlan(
      {
        examTarget,
        recommendedBatchNumber,
        totalBatches,
        batchSize,
      },
      referenceDate,
    );
  }

  const effectiveExamTarget =
    examTarget || learningDashboard.examDate
      ? {
          userId: examTarget?.userId ?? '',
          curriculum: examTarget?.curriculum ?? 'general',
          examDate: examTarget?.examDate ?? learningDashboard.examDate,
          dailyReviewCapacity:
            examTarget?.dailyReviewCapacity ?? learningDashboard.dailyReviewCapacity,
          dailyNewCapacity: examTarget?.dailyNewCapacity ?? learningDashboard.dailyNewCapacity,
          updatedAt: examTarget?.updatedAt ?? null,
        }
      : null;

  const examChip = getExamChip(effectiveExamTarget, referenceDate);

  const withExamChip = (chips: PracticeCoachPlanChip[]) => {
    if (examChip) {
      return [...chips, examChip];
    }

    return [...chips, { label: 'Readiness', value: formatPercent(learningDashboard.readiness) }];
  };

  const pressureGap = pressureInsights?.pressureGap ?? null;
  const overconfidenceRate = pressureInsights?.overconfidenceRate ?? null;
  const fatigue = pressureInsights?.avgSimulacroFatigue ?? null;

  if (pressureInsights?.recommendedMode === 'simulacro') {
    return {
      mode: 'simulacro',
      tone: 'pressure',
      eyebrow: 'Director de estudio',
      title: 'Mide tu nivel real',
      summary:
        'Ya tienes suficiente base para salir del entrenamiento guiado y comprobar rendimiento de examen.',
      primaryActionLabel: 'Lanzar simulacro',
      focusLabel: 'Presion real',
      impactLabel: 'Vas a medir transferencia real, no memoria en caliente ni familiaridad.',
      reasons: [
        'Sin simulacro, el readiness se parece demasiado al entrenamiento y demasiado poco al examen.',
        pressureInsights.pressureMessage,
      ],
      chips: withExamChip([
        { label: 'Banco visto', value: String(learningDashboard.seenQuestions) },
        { label: 'Readiness', value: formatPercent(learningDashboard.readiness) },
      ]),
    };
  }

  if (
    pressureInsights?.recommendedMode === 'anti_trap' ||
    (pressureGap !== null && pressureGap >= 0.12) ||
    (overconfidenceRate !== null && overconfidenceRate >= 0.22)
  ) {
    return {
      mode: 'anti_trap',
      tone: 'pressure',
      eyebrow: 'Director de estudio',
      title: 'Desactiva las trampas',
      summary:
        'Tus fallos mas caros ahora no vienen de no saber, sino de ritmo, literalidad y distractores cercanos.',
      primaryActionLabel: 'Entrenar anti-trampas',
      focusLabel: 'Errores caros',
      impactLabel: 'Reduciras la caida bajo presion y limpiaras errores evitables de examen.',
      reasons: [
        pressureInsights?.pressureMessage ??
          'Conviene atacar negaciones, plazos, excepciones y respuestas demasiado parecidas.',
        'Aqui gana mas valor afinar lectura y discriminacion que abrir preguntas nuevas.',
      ],
      chips: withExamChip([
        { label: 'Brecha', value: formatPoints(pressureGap) },
        { label: 'Simulacro', value: formatPercent(pressureInsights?.simulacroAccuracy) },
      ]),
    };
  }

  if (learningDashboard.overdueCount > learningDashboard.dailyReviewCapacity) {
    return {
      mode: 'mixed',
      tone: 'rescue',
      eyebrow: 'Director de estudio',
      title: 'Rescata lo que vence',
      summary: `Tienes ${learningDashboard.overdueCount} repasos urgentes. Hoy conviene absorber solo la parte rentable, no intentar vaciar todo el backlog.`,
      primaryActionLabel: 'Activar plan de hoy',
      focusLabel: 'Plan rescate',
      impactLabel: 'Bajas deuda sin saturarte y mantienes vivas las preguntas con mas riesgo.',
      reasons: [
        `Tu capacidad diaria esta en ${learningDashboard.dailyReviewCapacity}; meter mas hoy subiria fatiga y bajaria calidad.`,
        'El objetivo es proteger memoria util, no castigarte con una lista imposible.',
      ],
      chips: withExamChip([
        { label: 'Urgentes', value: String(learningDashboard.overdueCount) },
        { label: 'Hoy', value: String(learningDashboard.recommendedTodayCount) },
      ]),
    };
  }

  if (learningDashboard.recommendedReviewCount > 0) {
    return {
      mode: 'mixed',
      tone: fatigue !== null && fatigue >= 0.35 ? 'maintain' : 'build',
      eyebrow: 'Director de estudio',
      title: 'Consolida antes de avanzar',
      summary: `Hoy gana mas valor sostener ${learningDashboard.recommendedReviewCount} repasos y abrir ${learningDashboard.recommendedNewCount} nuevas con mezcla controlada.`,
      primaryActionLabel: 'Hacer sesion mixta',
      focusLabel: fatigue !== null && fatigue >= 0.35 ? 'Ritmo estable' : 'Consolidacion',
      impactLabel:
        fatigue !== null && fatigue >= 0.35
          ? 'Mantendras aprendizaje util sin disparar fatiga ni perder calidad al final.'
          : 'Mantendras memoria viva y seguiras ampliando banco sin ruido innecesario.',
      reasons: [
        learningDashboard.focusMessage,
        'Este es el punto donde mas retorno da una sesion adaptativa bien medida.',
      ],
      chips: withExamChip([
        { label: 'Repasos', value: String(learningDashboard.recommendedReviewCount) },
        { label: 'Nuevas', value: String(learningDashboard.recommendedNewCount) },
      ]),
    };
  }

  if (learningDashboard.recommendedNewCount > 0) {
    return {
      mode: 'standard',
      tone: 'advance',
      eyebrow: 'Director de estudio',
      title: `Avanza con el bloque ${recommendedBatchNumber}`,
      summary:
        'No hay urgencias reales ni caida bajo presion grave. Puedes ganar cobertura de temario con avance limpio.',
      primaryActionLabel: `Abrir bloque ${recommendedBatchNumber}`,
      focusLabel: 'Avance limpio',
      impactLabel:
        'Ampliaras banco sin comprometer mantenimiento ni convertir el dia en puro repaso.',
      reasons: [
        'Tu estado actual permite introducir nuevas sin deteriorar lo ya consolidado.',
        `Estas en el bloque ${recommendedBatchNumber} de ${Math.max(1, totalBatches)}.`,
      ],
      chips: withExamChip([
        { label: 'Bloque', value: `${recommendedBatchNumber}/${Math.max(1, totalBatches)}` },
        { label: 'Nuevas', value: String(learningDashboard.recommendedNewCount) },
      ]),
    };
  }

  return {
    mode: 'random',
    tone: 'maintain',
    eyebrow: 'Director de estudio',
    title: 'Refuerza recuperacion real',
    summary:
      'Hoy no manda ni la deuda ni la presion. Lo mas util es mezclar para sostener fluidez y reconocimiento rapido.',
    primaryActionLabel: 'Practicar mezcladas',
    focusLabel: 'Fluidez',
    impactLabel:
      'Mantendras agilidad, discriminacion y resistencia a la falsa sensacion de dominio.',
    reasons: [
      'Cuando el sistema esta estable, la mezcla corta da mejor senal que seguir demasiado guiado.',
      'Te interesa proteger velocidad y claridad, no solo porcentaje bruto de acierto.',
    ],
    chips: withExamChip([
      { label: 'Readiness', value: formatPercent(learningDashboard.readiness) },
      { label: 'Dominadas', value: String(learningDashboard.masteredCount) },
    ]),
  };
};
