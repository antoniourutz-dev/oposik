import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BookCopy,
  BookMarked,
  BookOpenCheck,
  ChevronRight,
  ClipboardList,
  Shuffle,
  Zap,
} from 'lucide-react';
import {
  buildStudyLawDescription,
  canonicalLawGroupKeyFromLeyReferencia,
  catalogMatchKeyForLaw,
  countQuestionsPerLpacap39Title,
  getLpacap39MergedTitles,
  mergeLawBreakdownRows,
  resolveStudyLawCardTitle,
  shouldGroupLpacap39ByTitles,
} from '../../domain/generalLaw';
import type {
  PracticeLawPerformance,
  PracticeQuestion,
  PracticeTopicPerformance,
} from '../../practiceTypes';
import { getFullCatalogQuestionsForCurriculum } from '../../services/preguntasApi';
import type { DashboardContentProps } from './types';

type TopicCategoryId = 'common' | 'specific';
/** Identificador de tarjeta de estudio: temas de oposición o `law-${índice}` por norma. */
type StudyCategoryId = TopicCategoryId | `law-${number}`;

type StudyItem = {
  key: string;
  /** Ley 39/2015: tarjeta de TÍTULO → inicia test de ese título. */
  rowKind?: 'section';
  label: string;
  /** Narrativa de territorio (leyes): intención de entrenamiento o título corto. */
  description?: string;
  badge: string;
  /** % dominio alto (legacy / leyes sin desglose por etapas). */
  progress: number;
  consolidatedCount: number;
  questionCount: number;
  /** Temario por oposición: reparto por etapa; si hay datos, la fila usa barra apilada. */
  masteryTiers?: TopicMasteryTiers;
  attempts: number;
  action: () => void;
  ariaLabel: string;
};

type TopicMasteryTiers = {
  unseen: number;
  fragile: number;
  consolidating: number;
  solid: number;
  mastered: number;
};

type StudyCategory = {
  id: StudyCategoryId;
  title: string;
  shortTitle: string;
  expectedItemCount: number;
  /** Leyes: número de bloques territoriales del servidor; null = sin desglose (solo tanda por ley). */
  lawBlockCount?: number | null;
  totalQuestions: number;
  consolidatedQuestions: number;
  progressPct: number;
  /** Solo temario por oposición: reparto por etapa de dominio (suma ≈ totalQuestions). */
  masteryTiers?: TopicMasteryTiers;
  /** Intentos registrados en el dashboard (tema o ley); para barra cuando no hay fases. */
  totalAttempts: number;
  gradient: string;
  emptyText: string;
  items: StudyItem[];
  showCatalogReview: boolean;
  /** Leyes: listado desde catálogo completo; fuerza subtítulo solo a «N preguntas». */
  lawCardSubtitlePreguntas?: number;
  /** Referencia normativa (law_blocks) para test con todo el catálogo de esa ley. */
  lawReference?: string;
};

const EXPECTED_TOPICS_BY_SCOPE: Record<TopicCategoryId, number> = {
  common: 19,
  specific: 12,
};

const LAW_CARD_GRADIENTS = [
  'from-slate-900 to-indigo-700',
  'from-indigo-950 to-violet-800',
  'from-slate-800 to-emerald-900',
  'from-violet-900 to-slate-800',
] as const;

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const safeDivPct = (num: number, den: number) => (den <= 0 ? 0 : clampPct((num / den) * 100));

/**
 * La barra simple (sin desglose por fases) solo reflejaba dominio alto (nivel ≥3), por eso podía
 * quedar en 0% con mucha práctica en niveles inferiores. Complementamos con volumen de intentos
 * del dashboard (suma en el tema) para que el avance sea visible antes del “consolidado”.
 */
const practiceVisibilityPctFromAttempts = (attempts: number, questionCount: number) => {
  if (attempts <= 0 || questionCount <= 0) return 0;
  const perQ = attempts / questionCount;
  return clampPct(88 * (1 - Math.exp(-perQ / 1.65)));
};

const topicBarDisplayPct = (consolidatedPct: number, attempts: number, questionCount: number) =>
  Math.max(consolidatedPct, practiceVisibilityPctFromAttempts(attempts, questionCount));

/** Un solo 0–100 alineado con las fases (barra apilada); pondera avance medio del tema. */
const topicPhaseWeightedPct = (tiers: TopicMasteryTiers, questionCount: number) => {
  if (questionCount <= 0) return 0;
  const score =
    (0 * tiers.unseen +
      22 * tiers.fragile +
      45 * tiers.consolidating +
      78 * tiers.solid +
      100 * tiers.mastered) /
    questionCount;
  return clampPct(score);
};

const topicRowBadgePercent = (
  showTierBar: boolean,
  tiers: TopicMasteryTiers | undefined,
  questionCount: number,
  consolidatedPct: number,
  attempts: number,
) =>
  showTierBar && tiers
    ? topicPhaseWeightedPct(tiers, questionCount)
    : topicBarDisplayPct(consolidatedPct, attempts, questionCount);
const normalizeTopicKey = (label: string) =>
  label.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const TOPIC_PREFIX_RE = /^\s*(\d{1,2})\s*\.\s*[–-]\s*/;

const extractTopicOrder = (label: string) => {
  const prefixedMatch = label.match(TOPIC_PREFIX_RE);
  const fallbackMatch = label.match(/\btema\s*(\d{1,2})\b/i) ?? label.match(/\b(\d{1,2})\b/);
  const match = prefixedMatch ?? fallbackMatch;
  if (!match) return Number.POSITIVE_INFINITY;
  return Number.parseInt(match[1] ?? '', 10) || Number.POSITIVE_INFINITY;
};

const stripTopicPrefix = (label: string) =>
  label.replace(TOPIC_PREFIX_RE, '').replace(/\s+/g, ' ').trim();

const sortTopics = (topics: PracticeTopicPerformance[]) =>
  [...topics].sort((a, b) => {
    const orderA = extractTopicOrder(a.topicLabel);
    const orderB = extractTopicOrder(b.topicLabel);
    if (orderA !== orderB) return orderA - orderB;
    return a.topicLabel.localeCompare(b.topicLabel, 'es', { sensitivity: 'base' });
  });

const dedupeTopics = (topics: PracticeTopicPerformance[]) => {
  const byKey = new Map<string, PracticeTopicPerformance>();

  for (const topic of topics) {
    const topicLabel = topic.topicLabel.trim();
    if (!topicLabel) continue;

    const topicOrder = extractTopicOrder(topicLabel);
    const key =
      Number.isFinite(topicOrder) && topicOrder !== Number.POSITIVE_INFINITY
        ? `topic-number:${topicOrder}`
        : `topic-label:${normalizeTopicKey(topicLabel)}`;
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, { ...topic, topicLabel });
      continue;
    }

    const currentQuestionCount = current.questionCount ?? 0;
    const nextQuestionCount = topic.questionCount ?? 0;
    const shouldReplaceLabel =
      nextQuestionCount > currentQuestionCount ||
      (nextQuestionCount === currentQuestionCount && topicLabel.length > current.topicLabel.length);

    byKey.set(key, {
      ...current,
      topicLabel: shouldReplaceLabel ? topicLabel : current.topicLabel,
      scope: current.scope === 'unknown' ? topic.scope : current.scope,
      attempts: current.attempts + topic.attempts,
      questionCount: (current.questionCount ?? 0) + (topic.questionCount ?? 0),
      consolidatedCount: (current.consolidatedCount ?? 0) + (topic.consolidatedCount ?? 0),
      unseenCount: (current.unseenCount ?? 0) + (topic.unseenCount ?? 0),
      fragileCount: (current.fragileCount ?? 0) + (topic.fragileCount ?? 0),
      consolidatingCount: (current.consolidatingCount ?? 0) + (topic.consolidatingCount ?? 0),
      solidCount: (current.solidCount ?? 0) + (topic.solidCount ?? 0),
      masteredCount: (current.masteredCount ?? 0) + (topic.masteredCount ?? 0),
      correctAttempts: current.correctAttempts + topic.correctAttempts,
      accuracyRate:
        current.attempts + topic.attempts <= 0
          ? 0
          : Number(
              (
                (current.correctAttempts + topic.correctAttempts) /
                (current.attempts + topic.attempts)
              ).toFixed(4),
            ),
    });
  }

  return [...byKey.values()];
};

const sortLaws = (laws: PracticeLawPerformance[]) =>
  [...laws].sort((a, b) =>
    a.ley_referencia.localeCompare(b.ley_referencia, 'es', { sensitivity: 'base' }),
  );

const truncateStudyStatement = (text: string, max = 160) => {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
};

const sortLawQuestionsForStudy = (qs: PracticeQuestion[]) =>
  [...qs].sort((a, b) => {
    const na = a.number ?? Number.POSITIVE_INFINITY;
    const nb = b.number ?? Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return a.id.localeCompare(b.id, 'es');
  });

const sumTopicMasteryTiers = (topics: PracticeTopicPerformance[]): TopicMasteryTiers =>
  topics.reduce(
    (acc, t) => ({
      unseen: acc.unseen + (t.unseenCount ?? 0),
      fragile: acc.fragile + (t.fragileCount ?? 0),
      consolidating: acc.consolidating + (t.consolidatingCount ?? 0),
      solid: acc.solid + (t.solidCount ?? 0),
      mastered: acc.mastered + (t.masteredCount ?? 0),
    }),
    { unseen: 0, fragile: 0, consolidating: 0, solid: 0, mastered: 0 },
  );

const tiersFromTopic = (t: PracticeTopicPerformance): TopicMasteryTiers => ({
  unseen: t.unseenCount ?? 0,
  fragile: t.fragileCount ?? 0,
  consolidating: t.consolidatingCount ?? 0,
  solid: t.solidCount ?? 0,
  mastered: t.masteredCount ?? 0,
});

const tierSum = (m: TopicMasteryTiers) =>
  m.unseen + m.fragile + m.consolidating + m.solid + m.mastered;

/**
 * Etiqueta breve para la tarjeta (sin texto largo): media ponderada 0–4 → 4 fases sencillas.
 * Sin datos de etapas, usa el % de dominio alto del bloque.
 */
const resolveCategoryPhaseBadge = (
  tiers: TopicMasteryTiers | undefined,
  totalQuestions: number,
  progressPctFallback: number,
): string => {
  if (tiers && totalQuestions > 0 && tierSum(tiers) > 0) {
    const w =
      (0 * tiers.unseen +
        1 * tiers.fragile +
        2 * tiers.consolidating +
        3 * tiers.solid +
        4 * tiers.mastered) /
      totalQuestions;
    if (w < 1.15) return 'Empezando';
    if (w < 2.25) return 'En marcha';
    if (w < 3.15) return 'Muy bien';
    return 'Genial';
  }
  if (progressPctFallback >= 50) return 'Muy bien';
  if (progressPctFallback >= 12) return 'En marcha';
  return 'Empezando';
};

const TIER_PHASE_TITLES: { key: keyof TopicMasteryTiers; label: string }[] = [
  { key: 'unseen', label: 'Sin empezar' },
  { key: 'fragile', label: 'Repaso' },
  { key: 'consolidating', label: 'Practicando' },
  { key: 'solid', label: 'Bien' },
  { key: 'mastered', label: 'Genial' },
];

/** Índice de fase 0–4 según media ponderada de preguntas por etapa. */
const masteryPhaseIndex = (tiers: TopicMasteryTiers, totalQuestions: number) => {
  if (totalQuestions <= 0 || tierSum(tiers) <= 0) return 0;
  const w =
    (0 * tiers.unseen +
      1 * tiers.fragile +
      2 * tiers.consolidating +
      3 * tiers.solid +
      4 * tiers.mastered) /
    totalQuestions;
  return Math.min(4, Math.max(0, Math.round(w)));
};

/**
 * Una sola barra de nivel (relleno continuo izquierda → derecha) con marcas entre niveles 1–5.
 * Sustituye la barra apilada multicolor + leyenda de cinco etiquetas.
 */
const TopicMasteryLevelBar: React.FC<{
  tiers: TopicMasteryTiers;
  totalQuestions: number;
  reduceMotion: boolean | null;
  variant: 'card' | 'row';
}> = ({ tiers, totalQuestions, reduceMotion, variant }) => {
  const pct = topicPhaseWeightedPct(tiers, totalQuestions);
  const phaseIdx = masteryPhaseIndex(tiers, totalQuestions);
  const phaseLabel = TIER_PHASE_TITLES[phaseIdx]?.label ?? '—';
  const levelNum = phaseIdx + 1;

  const track =
    variant === 'card'
      ? 'bg-white/14 ring-1 ring-white/25'
      : 'bg-slate-100 ring-1 ring-slate-200/90';
  const fill =
    variant === 'card'
      ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.45)]'
      : 'bg-violet-500 shadow-sm';
  const tick = variant === 'card' ? 'bg-white/28' : 'bg-slate-300/90';
  const captionMuted = variant === 'card' ? 'text-white/72' : 'text-slate-500';
  const captionStrong = variant === 'card' ? 'text-white' : 'text-slate-800';

  const aria = `Progreso ${Math.round(pct)} por ciento. Nivel ${levelNum} de 5: ${phaseLabel}.`;

  return (
    <div className="w-full">
      <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${track}`}>
        {[20, 40, 60, 80].map((mark) => (
          <div
            key={mark}
            className={`pointer-events-none absolute bottom-0 top-0 z-[1] w-px ${tick}`}
            style={{ left: `${mark}%` }}
            aria-hidden
          />
        ))}
        <motion.div
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
          className={`relative z-[2] h-full rounded-full ${fill}`}
        />
      </div>
      <p
        className={`mt-2 text-[10px] font-bold leading-snug tracking-tight ${captionMuted}`}
        aria-label={aria}
      >
        <span className={captionStrong}>Nivel {levelNum} de 5</span>
        <span className="mx-1.5 font-normal opacity-80">·</span>
        <span>{phaseLabel}</span>
      </p>
    </div>
  );
};

/** Solo un botón por TÍTULO de la LPACAP; al pulsar se inicia el test con las preguntas de ese título. */
function buildLpacap39TitleOnlyCards(
  sortedLawQuestions: PracticeQuestion[],
  onStartTitleTest: (titulo: string) => void,
): StudyItem[] {
  const counts = countQuestionsPerLpacap39Title(sortedLawQuestions);
  const titles = getLpacap39MergedTitles();
  const items: StudyItem[] = [];

  for (const { titulo, articleFrom, articleTo } of titles) {
    const n = counts.get(titulo) ?? 0;
    if (n === 0) continue;
    items.push({
      rowKind: 'section',
      key: `titulo-${titulo}`,
      label: `🔹 ${titulo}`,
      description: `Artículos: ${articleFrom}–${articleTo}`,
      badge: '',
      progress: 0,
      consolidatedCount: 0,
      questionCount: n,
      attempts: 0,
      action: () => onStartTitleTest(titulo),
      ariaLabel: `Test del titulo: ${titulo}. ${n} preguntas, articulos ${articleFrom} a ${articleTo}.`,
    });
  }

  return items;
}

const DashboardStudyTab: React.FC<DashboardContentProps> = ({
  activeLearningContext,
  catalogLoading = false,
  learningDashboardV2,
  onStartCatalogReview,
  onStartRandom,
  onStartLawTraining,
  onStartLawFullCatalogTraining,
  onStartLawLpacapTitleTraining,
  onStartTopicTraining,
  onStartStudyQuickFive,
  onStartStudySimulacro,
  onStartStudyAllTest,
  onStartStudyCommonTest,
  onStartStudySpecificTest,
  studyCommonQuestionCount,
  studySpecificQuestionCount,
  questionsCount,
}) => {
  const reduceMotion = useReducedMotion();
  const practiceLocked = catalogLoading || questionsCount === 0;
  const [expandedCategory, setExpandedCategory] = useState<StudyCategoryId | null>(null);
  const studyStructure = activeLearningContext?.config.studyStructure ?? 'opposition_topics';
  const supportsExamMode = activeLearningContext?.config.capabilities.supportsExamMode ?? true;
  const canStartCommon = studyCommonQuestionCount > 0;
  const canStartSpecific = studySpecificQuestionCount > 0;
  const curriculumKey = activeLearningContext?.curriculumKey ?? '';

  const { data: lawCatalogQuestions } = useQuery({
    queryKey: ['dashboard-study-law-catalog', curriculumKey],
    queryFn: () => getFullCatalogQuestionsForCurriculum(curriculumKey),
    enabled: studyStructure === 'law_blocks' && Boolean(curriculumKey),
    staleTime: 5 * 60_000,
  });

  const categories = useMemo<StudyCategory[]>(() => {
    if (studyStructure === 'law_blocks') {
      const lawBreakdown = sortLaws(
        mergeLawBreakdownRows(learningDashboardV2?.lawBreakdown ?? []),
      );

      if (lawBreakdown.length === 0) {
        return [
          {
            id: 'law-0' as StudyCategoryId,
            title: 'NORMATIVA',
            shortTitle: 'Normativa',
            expectedItemCount: 0,
            lawBlockCount: null,
            totalQuestions: 0,
            consolidatedQuestions: 0,
            progressPct: 0,
            totalAttempts: 0,
            gradient: LAW_CARD_GRADIENTS[0],
            emptyText: 'No hay leyes disponibles para este workspace todavia.',
            showCatalogReview: false,
            items: [],
          },
        ];
      }

      return lawBreakdown.map((law, lawIndex) => {
        const cardTitle = resolveStudyLawCardTitle(law);
        const blocks = law.blocks ?? [];
        const hasBlocks = blocks.length > 0;
        const totalQuestions = law.questionCount ?? 0;
        const consolidatedQuestions = law.consolidatedCount ?? 0;
        const totalAttempts = law.attempts ?? 0;

        const matchKey = catalogMatchKeyForLaw(law);
        const catalogForLaw =
          lawCatalogQuestions?.filter(
            (q) =>
              Boolean(q.ley_referencia?.trim()) &&
              canonicalLawGroupKeyFromLeyReferencia(q.ley_referencia) === matchKey,
          ) ?? [];
        const sortedLawQuestions = sortLawQuestionsForStudy(catalogForLaw);
        const useFullQuestionList = sortedLawQuestions.length > 0;

        let items: StudyItem[];
        let lawBlockCount: number | null;
        let lawCardSubtitlePreguntas: number | undefined;

        if (useFullQuestionList) {
          lawBlockCount = null;
          lawCardSubtitlePreguntas = sortedLawQuestions.length;
          if (shouldGroupLpacap39ByTitles(matchKey)) {
            items = buildLpacap39TitleOnlyCards(sortedLawQuestions, (titulo) =>
              onStartLawLpacapTitleTraining(law.ley_referencia, titulo),
            );
          } else {
            items = sortedLawQuestions.map((q, qi) => ({
              key: q.id,
              label: q.number != null ? `N.º ${q.number}` : `Pregunta ${qi + 1}`,
              description: truncateStudyStatement(q.statement),
              badge: String(qi + 1).padStart(2, '0'),
              progress: 0,
              consolidatedCount: 0,
              questionCount: 1,
              attempts: 0,
              action: () => onStartLawTraining(law.ley_referencia),
              ariaLabel: `Practicar ley ${cardTitle}: ${
                q.number != null ? `pregunta ${q.number}` : `pregunta ${qi + 1}`
              }`,
            }));
          }
        } else if (hasBlocks) {
          lawBlockCount = blocks.length;
          lawCardSubtitlePreguntas = undefined;
          items = blocks.map((block, bi) => ({
            key: `${law.ley_referencia}::${block.blockId}`,
            label: block.title,
            description: block.trainingFocus?.trim() || undefined,
            badge: String(bi + 1).padStart(2, '0'),
            progress: safeDivPct(block.consolidatedCount ?? 0, block.questionCount ?? 0),
            consolidatedCount: block.consolidatedCount ?? 0,
            questionCount: block.questionCount ?? 0,
            attempts: block.attempts ?? 0,
            action: () => onStartLawTraining(law.ley_referencia),
            ariaLabel: `Practicar bloque ${block.title} · ${cardTitle}`,
          }));
        } else {
          lawBlockCount = null;
          lawCardSubtitlePreguntas = undefined;
          items = [
            {
              key: law.ley_referencia,
              label: cardTitle,
              description: buildStudyLawDescription(law),
              badge: '01',
              progress: safeDivPct(consolidatedQuestions, totalQuestions),
              consolidatedCount: consolidatedQuestions,
              questionCount: totalQuestions,
              attempts: totalAttempts,
              action: () => onStartLawTraining(law.ley_referencia),
              ariaLabel: `Empezar practica de ley: ${cardTitle}`,
            },
          ];
        }

        return {
          id: `law-${lawIndex}` as StudyCategoryId,
          title: cardTitle,
          shortTitle: cardTitle,
          expectedItemCount: items.length,
          lawBlockCount,
          lawCardSubtitlePreguntas,
          totalQuestions,
          consolidatedQuestions,
          progressPct: safeDivPct(consolidatedQuestions, totalQuestions),
          totalAttempts,
          gradient: LAW_CARD_GRADIENTS[lawIndex % LAW_CARD_GRADIENTS.length],
          emptyText: 'No hay bloques disponibles para esta norma todavia.',
          showCatalogReview: false,
          items,
        };
      });
    }

    const topicBreakdown = learningDashboardV2?.topicBreakdown ?? [];
    const commonAll = sortTopics(
      dedupeTopics(topicBreakdown.filter((topic) => topic.scope === 'common')),
    ).slice(0, EXPECTED_TOPICS_BY_SCOPE.common);
    const specificAll = sortTopics(
      dedupeTopics(topicBreakdown.filter((topic) => topic.scope === 'specific')),
    ).slice(0, EXPECTED_TOPICS_BY_SCOPE.specific);

    const buildTopicCategory = (
      id: TopicCategoryId,
      title: string,
      shortTitle: string,
      gradient: string,
      topics: PracticeTopicPerformance[],
    ): StudyCategory => {
      const totalQuestions = topics.reduce((acc, topic) => acc + (topic.questionCount ?? 0), 0);
      const consolidatedQuestions = topics.reduce(
        (acc, topic) => acc + (topic.consolidatedCount ?? 0),
        0,
      );
      const masteryTiers = sumTopicMasteryTiers(topics);
      const totalAttempts = topics.reduce((acc, topic) => acc + (topic.attempts ?? 0), 0);

      return {
        id,
        title,
        shortTitle,
        expectedItemCount: EXPECTED_TOPICS_BY_SCOPE[id],
        totalQuestions,
        consolidatedQuestions,
        progressPct: safeDivPct(consolidatedQuestions, totalQuestions),
        masteryTiers,
        totalAttempts,
        gradient,
        emptyText: 'No hay temas disponibles para este bloque todavia.',
        showCatalogReview: true,
        items: topics.map((topic) => {
          const topicNumber = extractTopicOrder(topic.topicLabel);
          return {
            key: topic.topicLabel,
            label: stripTopicPrefix(topic.topicLabel),
            badge:
              Number.isFinite(topicNumber) && topicNumber !== Number.POSITIVE_INFINITY
                ? String(topicNumber).padStart(2, '0')
                : '--',
            progress: safeDivPct(topic.consolidatedCount ?? 0, topic.questionCount ?? 0),
            consolidatedCount: topic.consolidatedCount ?? 0,
            questionCount: topic.questionCount ?? 0,
            attempts: topic.attempts ?? 0,
            masteryTiers: tiersFromTopic(topic),
            action: () => onStartTopicTraining(topic.topicLabel),
            ariaLabel: `Empezar test del tema: ${stripTopicPrefix(topic.topicLabel)}`,
          };
        }),
      };
    };

    return [
      buildTopicCategory('common', 'TEMARIO COMUN', 'Comun', 'from-violet-500 to-indigo-600', commonAll),
      buildTopicCategory(
        'specific',
        'TEMARIO ESPECIFICO',
        'Especifico',
        'from-emerald-500 to-teal-600',
        specificAll,
      ),
    ];
  }, [
    lawCatalogQuestions,
    learningDashboardV2?.lawBreakdown,
    learningDashboardV2?.topicBreakdown,
    onStartLawLpacapTitleTraining,
    onStartLawTraining,
    onStartTopicTraining,
    studyStructure,
  ]);

  const totalQuestionsAll = categories.reduce((acc, category) => acc + category.totalQuestions, 0);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6 pb-14"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-2">
        <div>
          <h3 className="text-[1.9rem] font-black tracking-[-0.04em] text-slate-900">
            {activeLearningContext?.config.copyDictionary.studyTitle ?? 'Tu temario'}
          </h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            {totalQuestionsAll} preguntas
          </span>
        </div>
      </div>

      <section
        className="rounded-[1.35rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-4 shadow-sm sm:px-5 sm:py-5"
        aria-label="Modos de test"
      >
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          Modos de test
        </p>
        <p className="mt-1 text-[0.95rem] font-semibold leading-snug text-slate-600">
          {studyStructure === 'law_blocks'
            ? 'Practica con tandas cortas, simulacro o un bloque del catalogo legal.'
            : 'Practica con tandas cortas, simulacro o un bloque del temario comun o especifico.'}
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            disabled={practiceLocked}
            onClick={() => onStartStudyQuickFive()}
            className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-left transition-colors hover:bg-violet-100/90 disabled:pointer-events-none disabled:opacity-45"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <Zap className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.92rem] font-black tracking-tight text-slate-900">
                Test rapido
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-600">
                5 preguntas aleatorias del catalogo activo
              </span>
            </span>
          </button>

          {supportsExamMode ? (
            <button
              type="button"
              disabled={practiceLocked}
              onClick={() => onStartStudySimulacro()}
              className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.92rem] font-black tracking-tight text-slate-900">
                  Simulacro de examen
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-600">
                  Tanda larga con tiempo tipo prueba oficial
                </span>
              </span>
            </button>
          ) : null}

          {studyStructure !== 'law_blocks' ? (
            <>
              <button
                type="button"
                disabled={practiceLocked || !canStartCommon}
                onClick={() => onStartStudyCommonTest()}
                className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-violet-200/70 bg-white px-4 py-3 text-left transition-colors hover:bg-violet-50/60 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">
                  <BookCopy className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.92rem] font-black tracking-tight text-slate-900">
                    Test temario comun
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-600">
                    Bloque estandar solo comun
                    {canStartCommon ? (
                      <span className="text-slate-400"> · {studyCommonQuestionCount} preg.</span>
                    ) : (
                      <span className="text-amber-700"> · sin datos en este ambito</span>
                    )}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={practiceLocked || !canStartSpecific}
                onClick={() => onStartStudySpecificTest()}
                className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-left transition-colors hover:bg-emerald-50/60 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800">
                  <BookMarked className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.92rem] font-black tracking-tight text-slate-900">
                    Test temario especifico
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-600">
                    Bloque estandar solo especifico
                    {canStartSpecific ? (
                      <span className="text-slate-400"> · {studySpecificQuestionCount} preg.</span>
                    ) : (
                      <span className="text-amber-700"> · sin datos en este ambito</span>
                    )}
                  </span>
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={practiceLocked}
                onClick={() => onStartStudyAllTest()}
                className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-violet-200/70 bg-white px-4 py-3 text-left transition-colors hover:bg-violet-50/60 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">
                  <BookCopy className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.92rem] font-black tracking-tight text-slate-900">
                    Test normativa
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-600">
                    Bloque estandar del catalogo legal
                    {questionsCount > 0 ? (
                      <span className="text-slate-400"> · {questionsCount} preg.</span>
                    ) : null}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={practiceLocked}
                onClick={() => onStartRandom()}
                className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-left transition-colors hover:bg-emerald-50/60 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800">
                  <Shuffle className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.92rem] font-black tracking-tight text-slate-900">
                    Test aleatorio
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-600">
                    20 preguntas aleatorias del catalogo legal
                  </span>
                </span>
              </button>
            </>
          )}
        </div>
      </section>

      <div className="space-y-4">
        {categories.map((category) => {
          const isExpanded = expandedCategory === category.id;
          const phaseBadge =
            studyStructure === 'law_blocks'
              ? resolveCategoryPhaseBadge(undefined, category.totalQuestions, category.progressPct)
              : resolveCategoryPhaseBadge(
                  category.masteryTiers,
                  category.totalQuestions,
                  category.progressPct,
                );
          const fullLawQuestionCount =
            category.lawCardSubtitlePreguntas ?? category.totalQuestions;

          return (
            <div key={category.id} className="space-y-3">
              <motion.div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedCategory(isExpanded ? null : category.id);
                  }
                }}
                className={`relative w-full cursor-pointer overflow-hidden rounded-[32px] bg-gradient-to-br p-6 text-left shadow-xl transition-all duration-500 sm:rounded-[40px] sm:p-8 ${category.gradient} ${
                  isExpanded
                    ? 'scale-[1.02] ring-4 ring-slate-900/10 ring-offset-4'
                    : 'hover:scale-[1.01]'
                }`}
              >
                <div className="absolute right-0 top-0 p-6 opacity-10">
                  <BookOpenCheck className="h-20 w-20 text-white" />
                </div>

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.16em] text-white/78 sm:text-[11px]">
                      {studyStructure === 'law_blocks' ? (
                        category.lawCardSubtitlePreguntas != null ? (
                          <>{category.lawCardSubtitlePreguntas} preguntas</>
                        ) : category.lawBlockCount != null && category.lawBlockCount > 0 ? (
                          <>
                            {category.lawBlockCount} bloques · {category.totalQuestions} preguntas
                          </>
                        ) : (
                          <>{category.totalQuestions} preguntas</>
                        )
                      ) : (
                        <>
                          {category.expectedItemCount} temas · {category.totalQuestions} preguntas
                        </>
                      )}
                    </h4>
                    <h3 className="text-[1.45rem] font-black tracking-[-0.035em] text-white sm:text-[1.75rem]">
                      {category.title}
                    </h3>
                    <span className="mt-2 inline-flex max-w-[min(100%,20rem)] items-center rounded-full border border-white/30 bg-white/12 px-2.5 py-1 text-[11px] font-extrabold leading-none tracking-tight text-white shadow-sm backdrop-blur-sm">
                      {phaseBadge}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-white/20 p-2 backdrop-blur-md">
                    <ChevronRight
                      className={`h-5 w-5 text-white transition-transform duration-300 sm:h-6 sm:w-6 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {studyStructure === 'law_blocks' &&
                category.lawReference &&
                category.totalQuestions > 0 ? (
                  <div className="relative z-10 mt-4 w-full">
                    <button
                      type="button"
                      disabled={practiceLocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartLawFullCatalogTraining(category.lawReference!);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur-md transition hover:bg-white/25 disabled:pointer-events-none disabled:opacity-45"
                    >
                      <ClipboardList className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                      Test completo · {fullLawQuestionCount}{' '}
                      {fullLawQuestionCount === 1 ? 'pregunta' : 'preguntas'}
                    </button>
                  </div>
                ) : null}

                <div className="relative z-10 mt-6 sm:mt-8">
                  {category.masteryTiers && tierSum(category.masteryTiers) > 0 ? (
                    <TopicMasteryLevelBar
                      tiers={category.masteryTiers}
                      totalQuestions={category.totalQuestions}
                      reduceMotion={reduceMotion}
                      variant="card"
                    />
                  ) : (
                    <div className="h-2 overflow-hidden rounded-full bg-white/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${topicBarDisplayPct(
                            category.progressPct,
                            category.totalAttempts ?? 0,
                            category.totalQuestions,
                          )}%`,
                        }}
                        className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>

              <AnimatePresence>
                {isExpanded ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'circOut' }}
                    className={`space-y-3 px-1 ${
                      studyStructure === 'law_blocks'
                        ? 'max-h-[min(70vh,36rem)] overflow-y-auto overflow-x-hidden pr-1'
                        : 'overflow-hidden'
                    }`}
                  >
                    {category.showCatalogReview ? (
                      <motion.button
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        type="button"
                        onClick={() => onStartCatalogReview(category.id as TopicCategoryId)}
                        disabled={practiceLocked}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-900 transition-colors hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-45"
                      >
                        <Shuffle className="h-4 w-4" />
                        Estudiar todo el bloque
                      </motion.button>
                    ) : null}

                    {category.items.length === 0 ? (
                      <div className="w-full rounded-[24px] border border-slate-100 bg-white p-5 text-sm font-semibold text-slate-500">
                        {category.emptyText}
                      </div>
                    ) : null}

                    {category.items.map((item, index) => {
                      if (item.rowKind === 'section') {
                        return (
                          <motion.button
                            key={`${category.id}:${item.key}`}
                            type="button"
                            initial={reduceMotion ? false : { x: -12, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={item.action}
                            className="flex w-full items-start gap-3 rounded-[22px] border border-slate-200/90 bg-white px-4 py-4 text-left shadow-sm transition hover:border-violet-200/80 hover:bg-slate-50/90 sm:gap-4 sm:px-5 sm:py-4"
                            aria-label={item.ariaLabel}
                          >
                            <div className="min-w-0 flex-1">
                              <h5 className="text-[0.95rem] font-black leading-snug tracking-[-0.02em] text-slate-900">
                                {item.label}
                              </h5>
                              {item.description ? (
                                <p className="mt-2 whitespace-pre-line text-[11px] font-semibold leading-relaxed text-slate-600">
                                  {item.description}
                                </p>
                              ) : null}
                              {item.questionCount > 0 ? (
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                  {item.questionCount}{' '}
                                  {item.questionCount === 1 ? 'pregunta' : 'preguntas'}
                                </p>
                              ) : null}
                            </div>
                            <ChevronRight
                              className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
                              aria-hidden
                            />
                          </motion.button>
                        );
                      }

                      const rowTiers = item.masteryTiers;
                      const showTierBar =
                        rowTiers !== undefined && tierSum(rowTiers) > 0 && studyStructure !== 'law_blocks';
                      const fallbackBarPct = topicBarDisplayPct(
                        item.progress,
                        item.attempts ?? 0,
                        item.questionCount,
                      );
                      const hasProgress = fallbackBarPct > 0;
                      const badgePct = topicRowBadgePercent(
                        showTierBar,
                        rowTiers,
                        item.questionCount,
                        item.progress,
                        item.attempts ?? 0,
                      );

                      return (
                        <motion.button
                          key={`${category.id}:${item.key}`}
                          initial={reduceMotion ? false : { x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.025 }}
                          type="button"
                          onClick={item.action}
                          disabled={practiceLocked}
                          className="group flex min-h-[80px] w-full max-w-full items-center gap-4 rounded-[24px] border border-slate-100 bg-white px-4 py-4 text-left shadow-sm transition-shadow hover:shadow-md disabled:pointer-events-none disabled:opacity-45 sm:min-h-[88px] sm:px-5 sm:py-5"
                          aria-label={item.ariaLabel}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-sm font-black tabular-nums text-slate-500 transition-colors group-hover:bg-violet-50 group-hover:text-violet-700">
                            {item.badge}
                          </div>

                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h5 className="truncate text-[0.98rem] font-black tracking-[-0.02em] text-slate-800">
                              {item.label}
                            </h5>
                            {item.description && item.description !== item.label ? (
                              <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-500">
                                {item.description}
                              </p>
                            ) : null}
                            <div className="mt-3">
                              {showTierBar ? (
                                <TopicMasteryLevelBar
                                  tiers={rowTiers}
                                  totalQuestions={item.questionCount}
                                  reduceMotion={reduceMotion}
                                  variant="row"
                                />
                              ) : (
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                  <motion.div
                                    initial={reduceMotion ? false : { width: 0 }}
                                    animate={{ width: `${fallbackBarPct}%` }}
                                    className={`h-full rounded-full ${
                                      hasProgress ? 'bg-violet-500' : 'bg-slate-200'
                                    }`}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex h-11 min-w-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-violet-200/70 bg-violet-50/90 px-1 shadow-sm">
                            <span className="text-[12px] font-black tabular-nums leading-none text-violet-500 sm:text-[13px]">
                              {Math.round(badgePct)}%
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DashboardStudyTab;
