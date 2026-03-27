import {
  PRACTICE_BATCH_SIZE,
  SIMULACRO_TIME_LIMIT_SECONDS
} from '../practiceConfig';
import {
  ActivePracticeSession,
  PracticeQuestion,
  WeakQuestionInsight
} from '../practiceTypes';

export const buildSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}`;

export const buildStandardPracticeSession = ({
  batchStartIndex,
  questionsCount,
  questions,
  batchSize = PRACTICE_BATCH_SIZE
}: {
  batchStartIndex: number;
  questionsCount: number;
  questions: PracticeQuestion[];
  batchSize?: number;
}): ActivePracticeSession | null => {
  if (questions.length === 0) return null;

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
    subtitle: 'Ruta principal de practica en bloques consecutivos.',
    questions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber,
    totalBatches,
    batchStartIndex: normalizedStartIndex,
    continueLabel:
      nextBatchStartIndex > 0 ? 'Continuar con las siguientes 20' : 'Volver al panel',
    nextStandardBatchStartIndex: nextBatchStartIndex
  };
};

export const buildWeakestPracticeSession = (
  weakQuestions: WeakQuestionInsight[],
  batchSize = PRACTICE_BATCH_SIZE
): ActivePracticeSession | null => {
  const questions = weakQuestions.map((item) => item.question).slice(0, batchSize);
  if (questions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'weakest',
    feedbackMode: 'immediate',
    title: 'Repaso de preguntas mas falladas',
    subtitle: 'Sesion enfocada en tus errores recurrentes.',
    questions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null
  };
};

export const buildRandomPracticeSession = (
  questions: PracticeQuestion[]
): ActivePracticeSession | null => {
  if (questions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'random',
    feedbackMode: 'immediate',
    title: 'Sesion aleatoria',
    subtitle: 'Preguntas servidas en orden aleatorio.',
    questions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null
  };
};

export const buildMixedPracticeSession = (
  questions: PracticeQuestion[]
): ActivePracticeSession | null => {
  if (questions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'mixed',
    feedbackMode: 'immediate',
    title: 'Sesion adaptativa',
    subtitle: 'Repasos vencidos, fragiles y nuevas con prioridad inteligente.',
    questions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null
  };
};

export const buildAntiTrapPracticeSession = (
  questions: PracticeQuestion[]
): ActivePracticeSession | null => {
  if (questions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'anti_trap',
    feedbackMode: 'immediate',
    title: 'Entrenamiento anti-trampas',
    subtitle: 'Negaciones, plazos, excepciones y distractores cercanos.',
    questions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: null,
    batchNumber: 1,
    totalBatches: 1,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null
  };
};

export const buildSimulacroPracticeSession = (
  questions: PracticeQuestion[],
  timeLimitSeconds = SIMULACRO_TIME_LIMIT_SECONDS
): ActivePracticeSession | null => {
  if (questions.length === 0) return null;

  return {
    id: buildSessionId(),
    mode: 'simulacro',
    feedbackMode: 'deferred',
    title: 'Simulacro de examen',
    subtitle: 'Sin correccion inmediata y con tiempo global.',
    questions,
    startedAt: new Date().toISOString(),
    timeLimitSeconds,
    batchNumber: 1,
    totalBatches: 1,
    batchStartIndex: null,
    continueLabel: 'Volver al panel',
    nextStandardBatchStartIndex: null
  };
};

export const restartPracticeSession = (
  session: ActivePracticeSession
): ActivePracticeSession => ({
  ...session,
  id: buildSessionId(),
  startedAt: new Date().toISOString()
});
