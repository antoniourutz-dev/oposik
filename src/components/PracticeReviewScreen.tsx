import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  XCircle,
  Target,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  computeOverconfidenceScore,
  computeSessionFatigueScore,
  getErrorTypeLabel,
} from '../domain/learningEngine';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import {
  findHighlightOverrideForBlock,
  useQuestionHighlightOverrides,
} from '../hooks/useQuestionHighlightOverrides';
import { recordQuestionExplanationOpened } from '../services/practiceCloudApi';
import { HighlightedText } from './HighlightedText';
import QuestionExplanation from './QuestionExplanation';
import { StatementBody } from './StatementBody';
import type { ActiveLearningContext } from '../domain/learningContext/types';
import {
  ActivePracticeSession,
  ErrorType,
  OptionKey,
  PracticeAnswer,
  PracticeCategoryRiskSummary,
  PracticeLearningDashboardV2,
  PracticeMode,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeSessionSummary,
} from '../practiceTypes';
import { getSessionPresentation } from '../sessionPresentation';
import { LawPerformanceCard } from './dashboard/shared';
import type { CoachPlanV2 } from '../domain/learningEngine/coachV2';
import { buildReviewAdapterOutput } from '../adapters/surfaces/reviewAdapter';
import { buildSessionEndAdapterOutput } from '../adapters/surfaces/sessionEndAdapter';
import { resolveLawTerritoryContinuityHint } from '../domain/generalLaw';
import { orderReviewEntries } from '../adapters/surfaces/reviewOrdering';
import { buildCoachEffectTelemetryEvent } from '../adapters/telemetry/buildCoachEffectTelemetryEvent';
import { dispatchCoachTelemetry } from '../adapters/telemetry/dispatchCoachTelemetry';
import { writeSessionContinuity } from '../services/sessionContinuityStorage';

type ReviewFilter = 'incorrect' | 'all';

type PracticeReviewScreenProps = {
  answers: PracticeAnswer[];
  activeSession: ActivePracticeSession;
  surfaceContext: {
    planV2: CoachPlanV2;
    learningDashboardV2?: PracticeLearningDashboardV2 | null;
    pressureInsightsV2?: PracticePressureInsightsV2 | null;
    weakCategories?: PracticeCategoryRiskSummary[] | null;
    recentSessions?: PracticeSessionSummary[] | null;
    streakDays?: number;
    profile?: PracticeProfile | null;
    activeLearningContext?: ActiveLearningContext | null;
  };
  batchNumber: number;
  totalBatches: number;
  hasNextBatch: boolean;
  sessionMode?: PracticeMode;
  sessionStartedAt?: string;
  sessionQuestionCount?: number;
  sessionId?: string | null;
  curriculum?: string;
  timeLimitSeconds?: number | null;
  title?: string;
  subtitle?: string;
  continueLabel?: string;
  showRetry?: boolean;
  simplified?: boolean;
  onRetryBatch: () => void;
  onContinue: () => void;
  onBackToStart: () => void;
  /** Preferencia de perfil: resaltado en explicaciones. */
  textHighlightingEnabled?: boolean;
};

type ReviewEntry = {
  answer: PracticeAnswer;
  reviewIndex: number;
};

const INITIAL_REVIEW_RENDER_COUNT = 8;
const REVIEW_RENDER_STEP = 6;

const getReviewClosure = ({
  percentage,
  unansweredCount,
  sessionMode,
  fatigueScore,
  overconfidenceScore,
  hasNextBatch,
}: {
  percentage: number;
  unansweredCount: number;
  sessionMode: PracticeReviewScreenProps['sessionMode'];
  fatigueScore: number;
  overconfidenceScore: number;
  hasNextBatch: boolean;
}) => {
  const isSimulacro = sessionMode === 'simulacro';
  const outcomeHeadline = isSimulacro
    ? percentage >= 80 && unansweredCount === 0
      ? 'Simulacro muy solido'
      : percentage >= 65
        ? 'Base competitiva'
        : 'Simulacro de ajuste'
    : percentage >= 85
      ? 'Bloque muy solido'
      : percentage >= 70
        ? 'Buena consolidacion'
        : percentage >= 55
          ? 'Base util, aun fragil'
          : 'Sesion de ajuste';

  const outcomeSummary =
    unansweredCount > 0
      ? 'La prioridad inmediata es cerrar todas las preguntas antes de ampliar ritmo.'
      : overconfidenceScore >= 0.4
        ? 'El conocimiento esta, pero la lectura rapida te roba nota que no deberia escaparse.'
        : fatigueScore >= 0.45
          ? 'El rendimiento cae al final de la sesion. Conviene apretar menos y cerrar mejor.'
          : percentage >= 80
            ? 'Has cerrado la sesion con una base fiable y margen para seguir avanzando.'
            : 'Conviene limpiar este bloque antes de abrir demasiada carga nueva.';

  const resultBand =
    percentage >= 85
      ? 'Muy fino'
      : percentage >= 70
        ? 'Solido'
        : percentage >= 55
          ? 'En ajuste'
          : 'Fragil';

  const nextFocus =
    unansweredCount > 0
      ? 'Cerrar preguntas'
      : overconfidenceScore >= 0.4
        ? 'Frenar medio segundo'
        : fatigueScore >= 0.45
          ? 'Recortar fatiga'
          : hasNextBatch
            ? 'Mantener el ritmo'
            : 'Consolidar antes de seguir';

  /** Una sola tesis: prioriza señal conductual sobre la etiqueta de nota */
  let dominantEyebrow = 'Lectura principal';
  let dominantTitle = outcomeHeadline;
  let supportingLine = outcomeSummary;

  if (unansweredCount > 0) {
    dominantEyebrow = 'Bloque incompleto';
    dominantTitle = 'Sin cerrar el bloque, la nota no cuenta toda la historia.';
    supportingLine =
      'Cierra lo pendiente antes de sacar conclusiones: el ajuste empieza por completar.';
  } else if (overconfidenceScore >= 0.4) {
    dominantEyebrow = 'Ejecución';
    dominantTitle = 'Hoy te ha frenado más la prisa que el vacío de estudio.';
    supportingLine = outcomeSummary;
  } else if (fatigueScore >= 0.45) {
    dominantEyebrow = 'Ritmo';
    dominantTitle = 'El tramo final te ha costado más que el arranque.';
    supportingLine = outcomeSummary;
  } else if (percentage < 55 && unansweredCount === 0) {
    dominantEyebrow = 'Ajuste';
    dominantTitle = 'La sesión pide corrección, no veredicto: el patrón está abajo.';
    supportingLine = outcomeSummary;
  } else if (percentage >= 80) {
    dominantEyebrow = 'Lectura';
    dominantTitle = isSimulacro
      ? 'Buen ritmo competitivo: afina detalle donde aún sangras puntos.'
      : 'Base fiable: el siguiente paso es no regalar detalle.';
    supportingLine = outcomeSummary;
  }

  return {
    outcomeHeadline,
    outcomeSummary,
    resultBand,
    nextFocus,
    dominantEyebrow,
    dominantTitle,
    supportingLine,
  };
};

const formatDuration = (value: number | null) => {
  if (value === null) return null;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getExplanationKind = ({
  explanation,
  editorialExplanation,
}: {
  explanation: string | null;
  editorialExplanation?: string | null;
}) => {
  const hasExplanation = Boolean(explanation?.trim());
  const hasEditorialExplanation = Boolean(editorialExplanation?.trim());

  if (hasExplanation && hasEditorialExplanation) return 'both';
  if (hasEditorialExplanation) return 'editorial';
  return 'base';
};

const OPTION_ORDER: OptionKey[] = ['a', 'b', 'c', 'd'];

const ReviewEntryCard = React.memo(
  ({
    curriculum = DEFAULT_CURRICULUM,
    entry,
    sessionId = null,
    microTags = [],
    showErrorTypeLabel = false,
    isPriorityFocus = false,
    textHighlightingEnabled = false,
  }: {
    entry: ReviewEntry;
    sessionId?: string | null;
    curriculum?: string;
    microTags?: string[];
    showErrorTypeLabel?: boolean;
    /** Primero en el orden inteligente: más atención visual */
    isPriorityFocus?: boolean;
    textHighlightingEnabled?: boolean;
  }) => {
    const { answer, reviewIndex } = entry;
    const [isExplanationOpen, setIsExplanationOpen] = useState(false);
    const numericQuestionId = useMemo(() => {
      const parsed = Number(answer.question.id);
      return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
    }, [answer.question.id]);
    const { data: overrideRecords } = useQuestionHighlightOverrides(numericQuestionId);
    const selectedKey = answer.selectedOption;
    const correctKey = answer.question.correctOption;
    const selectedText = selectedKey ? answer.question.options[selectedKey] : null;
    const correctText = answer.question.options[correctKey];
    const questionHighlightOverride = findHighlightOverrideForBlock(overrideRecords, 'question');
    const explanationHighlightOverride = findHighlightOverrideForBlock(
      overrideRecords,
      'explanation',
    );
    const selectedAnswerOverride =
      selectedKey !== null
        ? findHighlightOverrideForBlock(
            overrideRecords,
            'answer',
            OPTION_ORDER.indexOf(selectedKey),
          )
        : null;
    const correctAnswerOverride = findHighlightOverrideForBlock(
      overrideRecords,
      'answer',
      OPTION_ORDER.indexOf(correctKey),
    );

    return (
      <article
        className={`overflow-hidden rounded-[1.25rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.92))] p-3.5 shadow-[0_20px_46px_-36px_rgba(141,147,242,0.16)] backdrop-blur ${
          isPriorityFocus && !entry.answer.isCorrect
            ? 'border-violet-400/55 ring-2 ring-violet-500/20'
            : 'border-white/80'
        }`}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(141,147,242,0.18))] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                  Pregunta {reviewIndex + 1}
                </span>
                {answer.question.category ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                    {answer.question.category}
                  </span>
                ) : null}
                {showErrorTypeLabel && answer.errorTypeInferred ? (
                  <span className="rounded-full bg-white/90 border border-slate-200 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                    {getErrorTypeLabel(answer.errorTypeInferred) ?? 'Error'}
                  </span>
                ) : null}
                {microTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700"
                  >
                    {t}
                  </span>
                ))}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${
                    answer.isCorrect
                      ? 'bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(74,222,128,0.14))] text-emerald-700'
                      : 'bg-[linear-gradient(135deg,rgba(244,63,94,0.12),rgba(251,113,133,0.14))] text-rose-700'
                  }`}
                >
                  {answer.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {answer.isCorrect ? 'Correcta' : 'Incorrecta'}
                </span>
              </div>
              <h3 className="mt-2 text-[1.05rem] font-extrabold leading-[1.5] tracking-[-0.02em] text-slate-900 sm:text-[1.1rem] sm:leading-[1.52]">
                <StatementBody
                  text={answer.question.statement}
                  highlightEnabled={textHighlightingEnabled}
                  manualOverride={questionHighlightOverride}
                />
              </h3>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div
              className={`rounded-[1rem] border px-3.5 py-2.5 ${
                answer.isCorrect
                  ? 'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,1),rgba(220,252,231,0.92))]'
                  : 'border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,1),rgba(255,228,230,0.92))]'
              }`}
            >
              <p className="ui-label text-slate-500">
                Tu respuesta
              </p>
              <p className="mt-1.5 text-[0.94rem] font-semibold leading-[1.58] text-slate-800 sm:text-[0.97rem] sm:leading-[1.62]">
                {selectedKey && selectedText ? (
                  <>
                    {selectedKey.toUpperCase()}){' '}
                    <HighlightedText
                      text={selectedText}
                      contentRole="answer_option"
                      allOptions={OPTION_ORDER.map((key) => answer.question.options[key])}
                      optionIndex={OPTION_ORDER.indexOf(selectedKey)}
                      manualOverride={selectedAnswerOverride}
                      disabled={!textHighlightingEnabled}
                    />
                  </>
                ) : (
                  'Sin responder'
                )}
              </p>
            </div>

            <div className="rounded-[1rem] border border-white/80 bg-[linear-gradient(180deg,rgba(236,246,255,0.9),rgba(241,247,255,0.92))] px-3.5 py-2.5">
              <p className="ui-label text-slate-500">
                Respuesta correcta
              </p>
              <p className="mt-1.5 text-[0.94rem] font-semibold leading-[1.58] text-slate-800 sm:text-[0.97rem] sm:leading-[1.62]">
                {correctKey.toUpperCase()}){' '}
                <HighlightedText
                  text={correctText}
                  contentRole="answer_option"
                  allOptions={OPTION_ORDER.map((key) => answer.question.options[key])}
                  optionIndex={OPTION_ORDER.indexOf(correctKey)}
                  manualOverride={correctAnswerOverride}
                  disabled={!textHighlightingEnabled}
                />
              </p>
            </div>
          </div>

          {!answer.isCorrect && answer.errorTypeInferred ? (
            <div className="rounded-[1rem] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.72))] px-3.5 py-2.5">
              <p className="ui-label text-amber-700">
                Clave del fallo
              </p>
              <p className="mt-1.5 text-[0.94rem] font-semibold leading-[1.58] text-amber-950 sm:text-[0.97rem] sm:leading-[1.62]">
                {getErrorTypeLabel(answer.errorTypeInferred) ?? 'Memoria fragil'}
              </p>
            </div>
          ) : null}

          {answer.timeToFirstSelectionMs && (
            <div className="flex items-center gap-4 px-1">
              <div className="flex-1">
                <p className="ui-label text-slate-400">
                  Velocidad de decisión
                </p>
                <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (answer.timeToFirstSelectionMs / 15000) * 100)}%`,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${answer.responseTimeMs && answer.timeToFirstSelectionMs / answer.responseTimeMs > 0.7 ? 'bg-indigo-400' : 'bg-sky-400'}`}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black tracking-[-0.01em] text-slate-600">
                  {Math.round(answer.timeToFirstSelectionMs / 100) / 10}s
                </p>
              </div>
            </div>
          )}

          <details
            className="rounded-[1rem] border border-white/80 bg-[linear-gradient(180deg,rgba(232,240,255,0.9),rgba(241,247,255,0.92))] px-3.5 py-2.5"
            onToggle={(event) => {
              const nextOpen = event.currentTarget.open;
              setIsExplanationOpen(nextOpen);
              if (!nextOpen) return;

              void recordQuestionExplanationOpened({
                questionId: answer.question.id,
                curriculum,
                sessionId,
                surface: 'review',
                explanationKind: getExplanationKind({
                  explanation: answer.question.explanation,
                  editorialExplanation: answer.question.editorialExplanation,
                }),
              }).catch(() => {});
            }}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.94rem] font-extrabold tracking-[-0.01em] text-indigo-900 transition-colors hover:text-indigo-950">
              <BookOpenText size={16} />
              Ver explicacion
            </summary>
            {isExplanationOpen ? (
              <div className="mt-2.5">
                <QuestionExplanation
                  explanation={answer.question.explanation}
                  editorialExplanation={answer.question.editorialExplanation}
                  highlightOverride={explanationHighlightOverride}
                  emptyLabel="Esta pregunta todavia no tiene explicacion cargada."
                  highlightEnabled={textHighlightingEnabled}
                />
              </div>
            ) : null}
          </details>
        </div>
      </article>
    );
  },
);

ReviewEntryCard.displayName = 'ReviewEntryCard';

const PracticeReviewScreen: React.FC<PracticeReviewScreenProps> = ({
  answers,
  activeSession,
  surfaceContext,
  batchNumber,
  totalBatches,
  hasNextBatch,
  sessionId = null,
  curriculum = DEFAULT_CURRICULUM,
  sessionMode = 'standard',
  sessionStartedAt,
  sessionQuestionCount,
  timeLimitSeconds = null,
  title,
  subtitle: _subtitle,
  continueLabel,
  showRetry = true,
  simplified = false,
  onRetryBatch,
  onContinue,
  onBackToStart,
  textHighlightingEnabled = false,
}) => {
  const totalQuestions = Math.max(sessionQuestionCount ?? answers.length, answers.length);
  const answeredCount = answers.length;
  const {
    fatigueScore,
    incorrectCount,
    incorrectEntries,
    lastAnsweredAt,
    overconfidenceScore,
    reviewEntries,
    score,
  } = useMemo(() => {
    const nextReviewEntries: ReviewEntry[] = [];
    const nextIncorrectEntries: ReviewEntry[] = [];
    const sessionAttempts = [];
    let nextScore = 0;
    let nextLastAnsweredAt: string | null = null;

    for (let index = 0; index < answers.length; index += 1) {
      const answer = answers[index];
      const entry = { answer, reviewIndex: index };
      nextReviewEntries.push(entry);
      if (!answer.isCorrect) {
        nextIncorrectEntries.push(entry);
      } else {
        nextScore += 1;
      }
      sessionAttempts.push({
        isCorrect: answer.isCorrect,
        responseTimeMs: answer.responseTimeMs,
        errorTypeInferred: answer.errorTypeInferred,
        changedAnswer: answer.changedAnswer,
      });
      nextLastAnsweredAt = answer.answeredAt ?? nextLastAnsweredAt;
    }

    return {
      fatigueScore: computeSessionFatigueScore(sessionAttempts),
      incorrectCount: nextIncorrectEntries.length,
      incorrectEntries: nextIncorrectEntries,
      lastAnsweredAt: nextLastAnsweredAt,
      overconfidenceScore: computeOverconfidenceScore(sessionAttempts),
      reviewEntries: nextReviewEntries,
      score: nextScore,
    };
  }, [answers]);
  const unansweredCount = Math.max(totalQuestions - answeredCount, 0);
  const answeredPct = totalQuestions === 0 ? 0 : Math.round((answeredCount / totalQuestions) * 100);
  const percentage = totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100);
  const fatigueLabel =
    fatigueScore >= 0.66 ? 'Fatiga alta' : fatigueScore >= 0.33 ? 'Fatiga media' : 'Fatiga baja';
  const overconfidenceLabel =
    overconfidenceScore >= 0.4
      ? 'Sobreconfianza alta'
      : overconfidenceScore >= 0.2
        ? 'Sobreconfianza media'
        : 'Sobreconfianza baja';
  const elapsedSeconds = sessionStartedAt
    ? Math.max(
        0,
        Math.round(
          ((lastAnsweredAt ? new Date(lastAnsweredAt) : new Date()).getTime() -
            new Date(sessionStartedAt).getTime()) /
            1000,
        ),
      )
    : null;
  const elapsedLabel = formatDuration(elapsedSeconds);
  const timeLimitLabel = formatDuration(timeLimitSeconds);
  const resolvedContinueLabel =
    continueLabel || (hasNextBatch ? 'Continuar con las siguientes 20' : 'Volver a empezar');
  const continueDockLabel = hasNextBatch
    ? 'Continuar'
    : !showRetry
      ? resolvedContinueLabel
      : sessionMode === 'simulacro'
        ? 'Panel'
        : resolvedContinueLabel.includes('panel')
          ? 'Panel'
          : 'Reiniciar';
  const sessionPresentation = getSessionPresentation((sessionMode || 'standard') as PracticeMode);
  const primarySignalLabel =
    overconfidenceScore > fatigueScore ? overconfidenceLabel : fatigueLabel;
  const resolvedTimeLabel =
    elapsedLabel && timeLimitLabel
      ? `${elapsedLabel} / ${timeLimitLabel}`
      : elapsedLabel
        ? elapsedLabel
        : timeLimitLabel;
  const reviewClosure = useMemo(
    () =>
      getReviewClosure({
        percentage,
        unansweredCount,
        sessionMode: (sessionMode || 'standard') as PracticeMode,
        fatigueScore,
        overconfidenceScore,
        hasNextBatch,
      }),
    [fatigueScore, hasNextBatch, overconfidenceScore, percentage, sessionMode, unansweredCount],
  );
  const scoreSurfaceClass =
    percentage >= 85
      ? 'border-emerald-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.94))] shadow-[0_24px_48px_-34px_rgba(16,185,129,0.24)]'
      : percentage >= 70
        ? 'border-sky-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] shadow-[0_24px_48px_-34px_rgba(125,182,232,0.22)]'
        : percentage >= 55
          ? 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))] shadow-[0_24px_48px_-34px_rgba(245,158,11,0.2)]'
          : 'border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.94))] shadow-[0_24px_48px_-34px_rgba(244,63,94,0.2)]';
  const nextStepSurfaceClass =
    unansweredCount > 0
      ? 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))]'
      : overconfidenceScore >= 0.4
        ? 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))]'
        : fatigueScore >= 0.45
          ? 'border-sky-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))]'
          : 'border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))]';
  const isQuickFiveSession = sessionMode === 'quick_five';
  const compactReviewLayout = simplified || isQuickFiveSession;
  const simplifiedHeroHeadline = isQuickFiveSession
    ? 'Cinco hechas, hilo intacto'
    : batchNumber >= totalBatches
      ? 'Prueba completada'
      : `Bloque ${batchNumber} completado`;
  const simplifiedReviewHint = isQuickFiveSession
    ? 'Cierre ligero por hoy. Manana puedes volver a una sesion normal.'
    : hasNextBatch
      ? 'Revisa este bloque y, si quieres, abre el siguiente.'
      : 'Revisa tus respuestas y cierra la prueba cuando termines.';
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(
    incorrectCount > 0 ? 'incorrect' : 'all',
  );
  /** Revisión pregunta a pregunta: colapsada por defecto; el alumno despliega si quiere el detalle. */
  const [detailReviewExpanded, setDetailReviewExpanded] = useState(false);
  /** Impacto por materia (normas): colapsado por defecto. */
  const [lawImpactExpanded, setLawImpactExpanded] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(true);
  const [renderedEntryCount, setRenderedEntryCount] = useState(INITIAL_REVIEW_RENDER_COUNT);
  const hideDockTimeoutRef = useRef<number | null>(null);
  const dockFrameRef = useRef<number | null>(null);
  const isDockVisibleRef = useRef(true);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const lawTerritoryContinuity = useMemo(() => {
    const ctx = surfaceContext.activeLearningContext;
    if (!ctx || ctx.contextType !== 'general_law') return undefined;
    if (ctx.config.studyStructure !== 'law_blocks') return undefined;
    return resolveLawTerritoryContinuityHint(
      activeSession.title,
      surfaceContext.learningDashboardV2?.lawBreakdown,
    );
  }, [
    activeSession.title,
    surfaceContext.activeLearningContext,
    surfaceContext.learningDashboardV2?.lawBreakdown,
  ]);

  const reviewExperience = useMemo(
    () =>
      buildReviewAdapterOutput({
        planV2: surfaceContext.planV2,
        answers,
        activeSession,
        surfaceContext: {
          learningDashboardV2: surfaceContext.learningDashboardV2,
          pressureInsightsV2: surfaceContext.pressureInsightsV2,
          weakCategories: surfaceContext.weakCategories,
          recentSessions: surfaceContext.recentSessions,
          streakDays: surfaceContext.streakDays,
          profile: surfaceContext.profile,
          activeLearningContext: surfaceContext.activeLearningContext,
        },
      }),
    [activeSession, answers, surfaceContext],
  );

  const sessionEndExperience = useMemo(
    () =>
      buildSessionEndAdapterOutput({
        planV2: surfaceContext.planV2,
        answers,
        activeSession,
        surfaceContext: {
          learningDashboardV2: surfaceContext.learningDashboardV2,
          pressureInsightsV2: surfaceContext.pressureInsightsV2,
          weakCategories: surfaceContext.weakCategories,
          recentSessions: surfaceContext.recentSessions,
          streakDays: surfaceContext.streakDays,
          profile: surfaceContext.profile,
          activeLearningContext: surfaceContext.activeLearningContext,
          lawTerritoryContinuity,
        },
      }),
    [activeSession, answers, lawTerritoryContinuity, surfaceContext],
  );

  const primaryExitCtaLabel = useMemo(
    () =>
      simplified
        ? continueDockLabel
        : sessionEndExperience.nextStep.cta || reviewExperience.nextStep.cta || continueDockLabel,
    [
      simplified,
      continueDockLabel,
      sessionEndExperience.nextStep.cta,
      reviewExperience.nextStep.cta,
    ],
  );

  const handleContinueCommitted = useCallback(() => {
    if (!simplified) {
      writeSessionContinuity({
        version: 1,
        finishedAt: new Date().toISOString(),
        dominantState: sessionEndExperience.dominantState,
        continuityLine: sessionEndExperience.continuityBridge,
        nextStepCta: primaryExitCtaLabel,
        mode: (sessionMode || 'standard') as PracticeMode,
        percentage,
      });
      dispatchCoachTelemetry(
        buildCoachEffectTelemetryEvent({
          surface: 'session_end',
          dominantState: sessionEndExperience.dominantState,
          ctaShown: primaryExitCtaLabel,
          ctaPressed: primaryExitCtaLabel,
          startedSession: false,
          completedSession: true,
          repeatedBlock: false,
          returnedHome: false,
          followedSuggestedPath: true,
          meta: { percentage, mode: String(sessionMode ?? 'standard') },
        }),
      );
    }
    onContinue();
  }, [
    simplified,
    sessionEndExperience.continuityBridge,
    sessionEndExperience.dominantState,
    primaryExitCtaLabel,
    sessionMode,
    percentage,
    onContinue,
  ]);

  const repeatedErrorTypes = useMemo<ReadonlySet<ErrorType>>(() => {
    const counts = new Map<ErrorType, number>();
    answers.forEach((a) => {
      if (a.isCorrect) return;
      if (!a.errorTypeInferred) return;
      counts.set(a.errorTypeInferred, (counts.get(a.errorTypeInferred) ?? 0) + 1);
    });
    const set = new Set<ErrorType>();
    counts.forEach((n, k) => {
      if (n >= 2) set.add(k);
    });
    return set;
  }, [answers]);

  const visibleEntries = useMemo(
    () => (reviewFilter === 'incorrect' ? incorrectEntries : reviewEntries),
    [incorrectEntries, reviewEntries, reviewFilter],
  );

  const orderedVisibleEntries = useMemo(() => {
    const byIndex = new Map(visibleEntries.map((e) => [e.reviewIndex, e]));
    return orderReviewEntries({
      items: visibleEntries.map((e) => ({
        answer: {
          isCorrect: e.answer.isCorrect,
          errorTypeInferred: e.answer.errorTypeInferred,
          questionCategory: e.answer.question.category ?? null,
        },
        reviewIndex: e.reviewIndex,
      })),
      filterPriority: reviewExperience.filterPriority,
      dominantState: reviewExperience.dominantState,
      sessionMode,
      repeatedErrorTypes,
      weakCategories: surfaceContext.weakCategories ?? null,
    })
      .map((ordered) => byIndex.get(ordered.reviewIndex))
      .filter((e): e is (typeof visibleEntries)[number] => Boolean(e));
  },
    [
      repeatedErrorTypes,
      reviewExperience.dominantState,
      reviewExperience.filterPriority,
      sessionMode,
      surfaceContext.weakCategories,
      visibleEntries,
    ],
  );

  const renderedEntries = useMemo(
    () => orderedVisibleEntries.slice(0, renderedEntryCount),
    [orderedVisibleEntries, renderedEntryCount],
  );
  const hasMoreEntries = renderedEntryCount < orderedVisibleEntries.length;
  const remainingEntries = Math.max(orderedVisibleEntries.length - renderedEntryCount, 0);
  const loadMoreEntries = useCallback(() => {
    setRenderedEntryCount((currentCount) =>
      Math.min(orderedVisibleEntries.length, currentCount + REVIEW_RENDER_STEP),
    );
  }, [orderedVisibleEntries.length]);

  useEffect(() => {
    isDockVisibleRef.current = isDockVisible;
  }, [isDockVisible]);

  useEffect(() => {
    const clearHideTimeout = () => {
      if (hideDockTimeoutRef.current !== null) {
        window.clearTimeout(hideDockTimeoutRef.current);
        hideDockTimeoutRef.current = null;
      }
    };

    const scheduleHide = () => {
      clearHideTimeout();
      hideDockTimeoutRef.current = window.setTimeout(() => {
        isDockVisibleRef.current = false;
        setIsDockVisible(false);
      }, 1400);
    };

    const handleScroll = () => {
      if (dockFrameRef.current !== null) return;
      dockFrameRef.current = window.requestAnimationFrame(() => {
        dockFrameRef.current = null;
        if (!isDockVisibleRef.current) {
          isDockVisibleRef.current = true;
          setIsDockVisible(true);
        }
        scheduleHide();
      });
    };

    scheduleHide();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearHideTimeout();
      if (dockFrameRef.current !== null) {
        window.cancelAnimationFrame(dockFrameRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setReviewFilter(incorrectCount > 0 ? 'incorrect' : 'all');
  }, [incorrectCount, batchNumber, totalBatches, sessionStartedAt]);

  useEffect(() => {
    setRenderedEntryCount(Math.min(visibleEntries.length, INITIAL_REVIEW_RENDER_COUNT));
  }, [visibleEntries.length, reviewFilter, batchNumber, totalBatches, sessionStartedAt]);

  useEffect(() => {
    if (
      !hasMoreEntries ||
      !loadMoreSentinelRef.current ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadMoreEntries();
        observer.disconnect();
      },
      {
        root: null,
        rootMargin: '0px 0px 420px 0px',
        threshold: 0.01,
      },
    );

    observer.observe(loadMoreSentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [detailReviewExpanded, hasMoreEntries, loadMoreEntries, renderedEntryCount]);

  const sessionLawBreakdown = useMemo(() => {
    const breakdown: Record<
      string,
      { ley_referencia: string; attempts: number; correctAttempts: number }
    > = {};

    answers.forEach((answer) => {
      const ley = answer.question.ley_referencia || 'Otras Normas';
      if (!breakdown[ley]) {
        breakdown[ley] = { ley_referencia: ley, attempts: 0, correctAttempts: 0 };
      }
      breakdown[ley].attempts += 1;
      if (answer.isCorrect) {
        breakdown[ley].correctAttempts += 1;
      }
    });

    return Object.values(breakdown)
      .map((item) => ({
        ...item,
        accuracyRate: Math.round((item.correctAttempts / item.attempts) * 100),
      }))
      .sort((a, b) => a.accuracyRate - b.accuracyRate);
  }, [answers]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-0 py-3 pb-12 sm:px-2 sm:pb-12 lg:px-4">
      {/* Lumina overlay header (solo para "review") */}
      <div className="sticky top-[max(env(safe-area-inset-top),0.75rem)] z-50">
        <div className="mx-auto flex items-center gap-2 rounded-[2rem] bg-white/80 px-2 py-2 shadow-sm backdrop-blur-[12px] border border-white/50">
          <button
            type="button"
            onClick={onBackToStart}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            aria-label="Volver al inicio"
          >
            <RotateCcw aria-hidden="true" size={20} strokeWidth={2.5} />
          </button>

          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-[width] duration-500"
              style={{ width: `${answeredPct}%` }}
            />
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[11px] font-black text-slate-400 tracking-[-0.02em]">
              {answeredCount}/{totalQuestions}
            </span>
            {resolvedTimeLabel ? (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                {resolvedTimeLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <section className="space-y-3.5">
        <div className="relative overflow-hidden rounded-[1.4rem] border border-slate-200/90 bg-[linear-gradient(165deg,rgba(15,23,42,0.97)_0%,rgba(30,27,75,0.96)_48%,rgba(49,46,129,0.94)_100%)] p-5 shadow-[0_28px_64px_-32px_rgba(15,23,42,0.55)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,0.08),transparent_45%)]" />
          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-200/95">
                {compactReviewLayout ? 'Revision' : reviewClosure.dominantEyebrow}
              </span>
              {!compactReviewLayout ? (
                <>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-100/80">
                    {sessionPresentation.eyebrow}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${
                      percentage >= 70
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                        : percentage >= 55
                          ? 'border-amber-400/35 bg-amber-500/15 text-amber-100'
                          : 'border-rose-400/35 bg-rose-500/15 text-rose-100'
                    }`}
                  >
                    Nota · {reviewClosure.resultBand}
                  </span>
                </>
              ) : null}
            </div>
            <h2 className="mt-4 text-[1.36rem] font-black leading-[1.08] tracking-[-0.05em] text-white sm:text-[1.56rem]">
              {compactReviewLayout ? simplifiedHeroHeadline : reviewClosure.dominantTitle}
            </h2>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-200/75">
              {title || `Bloque ${batchNumber} de ${totalBatches}`}
            </p>
            {!compactReviewLayout ? (
              <>
                <p className="mt-4 text-[1rem] font-medium leading-[1.64] text-violet-100/88">
                  {reviewClosure.supportingLine}
                </p>
                <p className="mt-4 border-t border-white/10 pt-4 text-[0.9rem] font-semibold leading-[1.54] text-indigo-100/90">
                  <span className="text-violet-200/80">Preparador · </span>
                  {sessionEndExperience.closingMessage.title}
                  <span className="font-medium text-indigo-100/75">
                    {' '}
                    — {sessionEndExperience.closingMessage.summary}
                  </span>
                </p>
              </>
            ) : null}
          </div>
        </div>

        {/* Cómo se ha manifestado (antes que normas o cifras) */}
        <div className="rounded-[1.4rem] overflow-hidden border border-[#d7e4fb] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Target size={20} />
            </div>
            <div>
              <p className="ui-label text-slate-400">
                Cómo se ha notado en la ejecución
              </p>
              <h3 className="text-base font-black text-slate-950 tracking-tight sm:text-lg">
                Patrón en el comportamiento
              </h3>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5 sm:p-4">
                <div className="flex justify-between items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-slate-600">Decisión impulsiva</span>
                  <span className="text-[11px] font-black text-slate-900 tabular-nums">
                    {
                      answers.filter(
                        (a) => a.timeToFirstSelectionMs && a.timeToFirstSelectionMs < 3000,
                      ).length
                    }{' '}
                    / {answers.length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(answers.filter((a) => a.timeToFirstSelectionMs && a.timeToFirstSelectionMs < 3000).length / Math.max(1, answers.length)) * 100}%`,
                    }}
                    transition={{ duration: 1, ease: 'circOut' }}
                    className="h-full rounded-full bg-rose-400"
                  />
                </div>
                <p className="mt-2 text-[12px] font-medium leading-[1.55] text-slate-500">
                  Respuestas marcadas en menos de 3 s: más riesgo de leer de más prisa que de saber de menos.
                </p>
                <p className="mt-2 text-[12px] font-bold leading-[1.55] text-rose-700/95">
                  Corrección: baja la velocidad de la primera decisión; termina el enunciado antes de fijarte en
                  opciones.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-indigo-400/25 bg-[linear-gradient(165deg,#1e1b4b_0%,#312e81_100%)] p-4 text-white shadow-inner sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-200/90">
                Una frase del preparador
              </p>
              <p className="mt-3 text-[1.02rem] font-bold leading-[1.58] tracking-[-0.018em]">
                {overconfidenceScore > 0.3
                  ? 'Lee el enunciado entero antes de tocar opción: suele costar menos que volver a fallar por prisa.'
                  : fatigueScore > 0.4
                    ? 'Si notas caída al final, prioriza una respuesta más lenta y cerrada que tres rápidas fallidas.'
                    : 'Ritmo y lectura alineados: el siguiente salto es afilar detalle donde aún pierdes margen.'}
              </p>
            </div>
          </div>
        </div>

        {sessionLawBreakdown.length > 0 ? (
          <div className="overflow-hidden rounded-[1.4rem] border border-indigo-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setLawImpactExpanded((open) => !open)}
              aria-expanded={lawImpactExpanded}
              className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300/80 sm:px-5 sm:py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Target size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="ui-label text-slate-400">Dónde ha pesado la norma</p>
                <h3 className="mt-0.5 text-base font-black tracking-tight text-slate-950 sm:text-lg">
                  Impacto por materia
                </h3>
                <p className="mt-2 text-[13px] font-semibold leading-[1.45] text-slate-500">
                  {lawImpactExpanded
                    ? 'Puedes ocultar este bloque cuando ya hayas visto el reparto por norma.'
                    : `${sessionLawBreakdown.length} materia${sessionLawBreakdown.length === 1 ? '' : 's'} en esta sesión. Despliega para ver el detalle por norma.`}
                </p>
              </div>
              <ChevronDown
                aria-hidden
                className={`mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
                  lawImpactExpanded ? 'rotate-180' : ''
                }`}
                strokeWidth={2.5}
              />
            </button>
            {lawImpactExpanded ? (
              <div className="border-t border-indigo-100 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {sessionLawBreakdown.map((law, idx) => (
                    <LawPerformanceCard
                      key={idx}
                      ley_referencia={law.ley_referencia}
                      accuracy={law.accuracyRate}
                      attempts={law.attempts}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-[1.05rem] border px-3 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] ${scoreSurfaceClass}`}
            >
              <p className="ui-label text-slate-500">
                Resultado (contexto)
              </p>
              <p className="mt-1.5 text-[1.78rem] font-black leading-none tracking-[-0.05em] text-slate-950 sm:text-[1.92rem]">
                {score}
                <span className="text-[0.85rem] text-slate-400 sm:text-[1rem]">
                  {' '}
                  / {totalQuestions}
                </span>
              </p>
              <p className="mt-1 text-[12px] font-semibold text-slate-500">{percentage}% acierto</p>
            </div>

            <div
              className={`rounded-[1.05rem] border px-3 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] ${nextStepSurfaceClass}`}
            >
              <p className="ui-label text-slate-500">
                {compactReviewLayout ? 'Siguiente' : 'Siguiente lectura'}
              </p>
              <p className="mt-1.5 text-[1rem] font-black leading-[1.2] tracking-[-0.02em] text-slate-950 sm:text-[1.04rem]">
                {compactReviewLayout ? simplifiedReviewHint : reviewExperience.summary.title}
              </p>
              {!compactReviewLayout ? (
                <p className="mt-1.5 text-[12px] font-semibold leading-[1.55] text-slate-600 sm:text-[13px]">
                  {reviewExperience.summary.subtitle ??
                    sessionEndExperience.nextStep.description ??
                    reviewClosure.outcomeSummary}
                </p>
              ) : null}
            </div>
          </div>

          {!compactReviewLayout ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-3 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
                <p className="ui-label text-slate-500">
                  Cierre
                </p>
                <p className="mt-1.5 text-[1rem] font-black leading-none text-slate-950">
                  {answeredCount}/{totalQuestions}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  {unansweredCount > 0 ? `${unansweredCount} sin responder` : 'Sin huecos'}
                </p>
              </div>

              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-3 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
                <p className="ui-label text-slate-500">
                  Senal
                </p>
                <p className="mt-1.5 text-[0.95rem] font-black leading-[1.22] text-slate-950">
                  {primarySignalLabel}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Lectura de sesion</p>
              </div>

              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-3 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
                <p className="ui-label text-slate-500">
                  Tiempo
                </p>
                <p className="mt-1.5 text-[1rem] font-black leading-none text-slate-950">
                  {resolvedTimeLabel ?? '--'}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  {timeLimitLabel ? 'Con limite' : 'Sin crono'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="overflow-hidden rounded-[1.25rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] shadow-[0_20px_46px_-34px_rgba(141,147,242,0.16)]">
          <button
            type="button"
            onClick={() => setDetailReviewExpanded((open) => !open)}
            aria-expanded={detailReviewExpanded}
            className="flex w-full items-start gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-sky-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300/80 sm:px-4 sm:py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="ui-label text-slate-500">Revisión pregunta a pregunta</p>
              <p className="mt-1 text-[1.02rem] font-black leading-[1.25] tracking-[-0.02em] text-slate-950">
                {score}/{totalQuestions} aciertos
                {incorrectCount > 0 ? (
                  <span className="text-rose-600">
                    {' '}
                    · {incorrectCount} incorrecta{incorrectCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="text-emerald-700"> · Sin fallos</span>
                )}
              </p>
              <p className="mt-2 text-[13px] font-semibold leading-[1.45] text-slate-500">
                {detailReviewExpanded
                  ? 'Puedes ocultar este panel cuando termines de revisar.'
                  : 'Resumen compacto. Despliega para ver enunciados, opciones y explicaciones.'}
              </p>
            </div>
            <ChevronDown
              aria-hidden
              className={`mt-0.5 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
                detailReviewExpanded ? 'rotate-180' : ''
              }`}
              strokeWidth={2.5}
            />
          </button>

          {detailReviewExpanded ? (
            <div className="space-y-2.5 border-t border-[#d7e4fb] px-3.5 pb-3 pt-2 sm:px-4 sm:pb-4">
              <div className="rounded-[1.1rem] border border-[#e8f0fc] bg-white/90 px-3 py-3 shadow-sm sm:px-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="ui-label text-slate-500">Revisión precisa</p>
                    <p className="mt-1 text-[1rem] font-black leading-[1.25] tracking-[-0.02em] text-slate-950">
                      {reviewFilter === 'incorrect'
                        ? 'Donde más te ha costado'
                        : 'Todas las respuestas'}
                    </p>
                  </div>
                  <div className="inline-flex rounded-full border border-[#d7e4fb] bg-white/90 p-1 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.16)]">
                    <button
                      type="button"
                      onClick={() => setReviewFilter('incorrect')}
                      disabled={incorrectCount === 0}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-all duration-200 ${
                        reviewFilter === 'incorrect'
                          ? 'quantia-bg-gradient text-white shadow-[0_12px_22px_-16px_rgba(141,147,242,0.28)]'
                          : 'text-slate-500 hover:bg-sky-50/80'
                      } ${incorrectCount === 0 ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : ''}`}
                    >
                      Incorrectas
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-all duration-200 ${
                        reviewFilter === 'all'
                          ? 'quantia-bg-gradient text-white shadow-[0_12px_22px_-16px_rgba(141,147,242,0.28)]'
                          : 'text-slate-500 hover:bg-sky-50/80'
                      }`}
                    >
                      Todas
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-[1.5] text-slate-500">
                  {reviewFilter === 'incorrect'
                    ? `${incorrectCount} fallo${incorrectCount === 1 ? '' : 's'} en orden de prioridad`
                    : `${answers.length} respuesta${answers.length === 1 ? '' : 's'} resuelta${answers.length === 1 ? '' : 's'}`}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Mostrando {renderedEntries.length} de {visibleEntries.length}
                </p>
              </div>

              {renderedEntries.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-[#d7e4fb] bg-white/80 px-4 py-5 text-center shadow-[0_18px_34px_-30px_rgba(141,147,242,0.14)]">
                  <p className="text-[1.04rem] font-black tracking-[-0.02em] text-slate-900">
                    No hay respuestas para revisar
                  </p>
                  <p className="mt-1.5 text-[14px] font-semibold leading-[1.55] text-slate-500">
                    Completa un bloque para abrir esta lectura con detalle.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2.5 xl:grid-cols-2">
                {renderedEntries.map((entry, idx) => {
                  const tags: string[] = [];
                  if (!entry.answer.isCorrect) {
                    if (reviewExperience.dominantState === 'pressure' || sessionMode === 'simulacro') {
                      tags.push('Fallo bajo presión');
                    }
                    if (entry.answer.errorTypeInferred === 'lectura_rapida') {
                      tags.push('Error de lectura');
                    }
                    if (
                      entry.answer.errorTypeInferred &&
                      repeatedErrorTypes.has(entry.answer.errorTypeInferred)
                    ) {
                      tags.push('Error repetido');
                    }
                  }

                  return (
                    <ReviewEntryCard
                      key={`${entry.answer.question.id}-${entry.reviewIndex}`}
                      entry={entry}
                      sessionId={sessionId}
                      curriculum={curriculum}
                      microTags={tags}
                      showErrorTypeLabel={reviewExperience.explanationStyle.showErrorTypeLabel}
                      isPriorityFocus={idx === 0}
                      textHighlightingEnabled={textHighlightingEnabled}
                    />
                  );
                })}
              </div>

              {hasMoreEntries ? (
                <div
                  ref={loadMoreSentinelRef}
                  className="flex flex-col items-center gap-2 rounded-[1.15rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] px-4 py-3.5 shadow-[0_20px_40px_-34px_rgba(141,147,242,0.16)]"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Quedan {remainingEntries} por cargar
                  </p>
                  <button
                    type="button"
                    onClick={loadMoreEntries}
                    className="rounded-full border border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.18))] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-800 shadow-[0_12px_24px_-20px_rgba(141,147,242,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(141,147,242,0.22))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98]"
                  >
                    Cargar {Math.min(REVIEW_RENDER_STEP, remainingEntries)} mas
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {!compactReviewLayout && sessionEndExperience.microRewards.length > 0 ? (
        <div className="mx-3 mt-6 rounded-[1.1rem] border border-emerald-200/55 bg-emerald-50/45 px-3.5 py-3 sm:mx-2 lg:mx-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-900/75">
            Proceso reconocido
          </p>
          <ul className="mt-2 space-y-1">
            {sessionEndExperience.microRewards.map((line) => (
              <li key={line} className="text-[13px] font-semibold leading-[1.5] text-emerald-950/90">
                · {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* CTA: una sola siguiente jugada (session end manda el copy) */}
      <div className="mt-10 px-3 sm:px-2 lg:px-4">
        {showRetry ? (
          <button
            type="button"
            onClick={onRetryBatch}
            className="ui-button-text w-full rounded-[28px] border border-slate-200/80 bg-white py-4 text-slate-800 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] transition-[transform,filter] duration-200 hover:brightness-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55"
          >
            Repetir
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleContinueCommitted}
          className={`ui-button-text w-full rounded-[28px] bg-slate-950 py-5 text-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)] ring-1 ring-white/10 transition-[transform,filter] duration-200 hover:brightness-[1.06] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55 ${
            showRetry ? 'mt-4' : 'mt-0'
          }`}
        >
          {primaryExitCtaLabel}
        </button>

        {!compactReviewLayout ? (
          <p className="mx-auto mt-3 max-w-md text-center text-[12px] font-medium leading-[1.55] text-slate-500">
            {sessionEndExperience.nextStep.description ??
              reviewExperience.summary.subtitle ??
              reviewClosure.nextFocus}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default PracticeReviewScreen;
