import { PRACTICE_BATCH_SIZE, SIMULACRO_TIME_LIMIT_SECONDS } from '../practiceConfig';
import {
  ActivePracticeSession,
  PracticeQuestionScope,
  PracticeQuestionScopeFilter,
  PracticeQuestion,
  WeakQuestionInsight,
} from '../practiceTypes';
import { getQuestionScopeHint, getQuestionScopeLabel } from '../utils/practiceQuestionScope';

/** UUID v4 sin depender de `crypto.randomUUID` (p. ej. entornos antiguos o tests). */
const uuidV4 = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/** `practice_sessions.session_id` es UUID en Supabase; cadenas como `session-123` fallan al upsert. */
export const buildSessionId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : uuidV4();

const dedupeQuestions = (questions: PracticeQuestion[]) => {
  const seenIds = new Set<string>();
  const nextQuestions: PracticeQuestion[] = [];

  for (const question of questions) {
    const questionId = String(question.id ?? '').trim();
    if (!questionId || seenIds.has(questionId)) {
      continue;
    }

    seenIds.add(questionId);
    nextQuestions.push(question);
  }

  return nextQuestions;
};

export const buildStandardPracticeSession = ({
  batchStartIndex,
  questionsCount,
  questions,
  questionScope = 'all',
  batchSize = PRACTICE_BATCH_SIZE,
}: {
  batchStartIndex: number;
  questionsCount: number;
  questions: PracticeQuestion[];
  questionScope?: PracticeQuestionScopeFilter;
  batchSize?: number;
}): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  const normalizedStartIndex =
    batchStartIndex >= 0 && batchStartIndex < questionsCount ? batchStartIndex : 0;
  const totalBatches = Math.max(1, Math.ceil(questionsCount / batchSize));
  const batchNumber = Math.floor(normalizedStartIndex / batchSize) + 1;
  const nextBatchStartIndex =
    normalizedStartIndex + batchSize < questionsCount ? normalizedStartIndex + batchSize : 0;

  return {
    id: buildSessionId(),
    mode: 'standard',
    feedbackMode: 'immediate',
    title: `Bloque ${batchNumber} de ${totalBatches}`,
    subtitle: `Ruta principal de ${getQuestionScopeHint(questionScope)}.`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber,
    totalBatches,
    questionScope,
    batchStartIndex: normalizedStartIndex,
    continueLabel: nextBatchStartIndex > 0 ? 'Continuar con las siguientes 20' : 'Volver al panel',
    nextStandardBatchStartIndex: nextBatchStartIndex,
  };
};

export const buildWeakestPracticeSession = (
  weakQuestions: WeakQuestionInsight[],
  questionScope: PracticeQuestionScopeFilter = 'all',
  batchSize = PRACTICE_BATCH_SIZE,
): ActivePracticeSession | null => {
  const questions = dedupeQuestions(weakQuestions.map((item) => item.question)).slice(0, batchSize);
  if (questions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'weakest',
    feedbackMode: 'immediate',
    title: `Repaso ${getQuestionScopeLabel(questionScope).toLowerCase()}`,
    subtitle: `Sesion enfocada en tus errores recurrentes de ${getQuestionScopeHint(questionScope)}.`,
    questions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    questionScope,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};

export const buildRandomPracticeSession = (
  questions: PracticeQuestion[],
  questionScope: PracticeQuestionScopeFilter = 'all',
): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'random',
    feedbackMode: 'immediate',
    title:
      questionScope === 'all'
        ? 'Sesion aleatoria'
        : `Sesion aleatoria - ${getQuestionScopeLabel(questionScope)}`,
    subtitle: `Preguntas servidas en orden aleatorio de ${getQuestionScopeHint(questionScope)}.`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    questionScope,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};

export const buildGuestPracticeSession = ({
  questions,
  blockNumber,
  totalBlocks,
}: {
  questions: PracticeQuestion[];
  blockNumber: number;
  totalBlocks: number;
}): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  const normalizedTotalBlocks = Math.max(1, totalBlocks);
  const normalizedBlockNumber = Math.min(normalizedTotalBlocks, Math.max(1, blockNumber));

  return {
    id: buildSessionId(),
    mode: 'random',
    feedbackMode: 'immediate',
    title: `Bloque de prueba ${normalizedBlockNumber}/${normalizedTotalBlocks}`,
    subtitle: 'Acceso invitado con preguntas aleatorias del temario comun.',
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: normalizedBlockNumber,
    totalBatches: normalizedTotalBlocks,
    questionScope: 'common',
    batchStartIndex: null,
    continueLabel:
      normalizedBlockNumber < normalizedTotalBlocks ? 'Siguiente bloque' : 'Cerrar acceso',
    nextStandardBatchStartIndex: null,
  };
};

export const buildMixedPracticeSession = (
  questions: PracticeQuestion[],
  questionScope: PracticeQuestionScopeFilter = 'all',
): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'mixed',
    feedbackMode: 'immediate',
    title:
      questionScope === 'all'
        ? 'Sesion adaptativa'
        : `Sesion adaptativa - ${getQuestionScopeLabel(questionScope)}`,
    subtitle: `Repasos vencidos, fragiles y nuevas con prioridad inteligente de ${getQuestionScopeHint(questionScope)}.`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    questionScope,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};

export const buildAntiTrapPracticeSession = (
  questions: PracticeQuestion[],
  questionScope: PracticeQuestionScopeFilter = 'all',
): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'anti_trap',
    feedbackMode: 'immediate',
    title:
      questionScope === 'all'
        ? 'Anti-trampas'
        : `Anti-trampas - ${getQuestionScopeLabel(questionScope)}`,
    subtitle: `Negaciones, plazos, excepciones y distractores cercanos de ${getQuestionScopeHint(questionScope)}.`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    questionScope,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};

export const buildSimulacroPracticeSession = (
  questions: PracticeQuestion[],
  questionScopeOrTimeLimit: PracticeQuestionScopeFilter | number = 'all',
  timeLimitSeconds = SIMULACRO_TIME_LIMIT_SECONDS,
): ActivePracticeSession | null => {
  const questionScope =
    typeof questionScopeOrTimeLimit === 'number' ? 'all' : questionScopeOrTimeLimit;
  const resolvedTimeLimitSeconds =
    typeof questionScopeOrTimeLimit === 'number' ? questionScopeOrTimeLimit : timeLimitSeconds;
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'simulacro',
    feedbackMode: 'deferred',
    title:
      questionScope === 'all' ? 'Simulacro' : `Simulacro - ${getQuestionScopeLabel(questionScope)}`,
    subtitle: `Sin correccion inmediata y con tiempo global sobre ${getQuestionScopeHint(questionScope)}.`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: resolvedTimeLimitSeconds,
    batchNumber: 1,
    totalBatches: 1,
    questionScope,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};

export const buildCatalogReviewSession = ({
  questions,
  scope,
}: {
  questions: PracticeQuestion[];
  scope: PracticeQuestionScope;
}): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  const scopeLabel = scope === 'common' ? 'Temario común' : 'Temario específico';

  return {
    id: buildSessionId(),
    mode: 'catalog_review',
    feedbackMode: 'immediate',
    title: 'Análisis del banco',
    subtitle: `${scopeLabel} · ${uniqueQuestions.length} preguntas`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    questionScope: scope,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};

export const restartPracticeSession = (session: ActivePracticeSession): ActivePracticeSession => ({
  ...session,
  id: buildSessionId(),
  startedAt: new Date().toISOString(),
});

export const buildLawPracticeSession = (
  questions: PracticeQuestion[],
  law: string,
): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  return {
    id: buildSessionId(),
    // Use random mode for focused law training sessions
    mode: 'random',
    feedbackMode: 'immediate',
    title: law,
    subtitle: `Entrenamiento monográfico sobre la base normativa de ${law}.`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    questionScope: 'all',
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};

export const buildTopicPracticeSession = (
  questions: PracticeQuestion[],
  topic: string,
): ActivePracticeSession | null => {
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'random',
    feedbackMode: 'immediate',
    title: topic,
    subtitle: `Entrenamiento monografico centrado en ${topic}.`,
    questions: uniqueQuestions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    questionScope: 'all',
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null,
  };
};
