import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpenCheck, ChevronRight, Shuffle, Zap } from 'lucide-react';
import { buildStudyLawDescription } from '../../domain/generalLaw';
import type { PracticeLawPerformance, PracticeTopicPerformance } from '../../practiceTypes';
import type { DashboardContentProps } from './types';

type TopicCategoryId = 'common' | 'specific';
type StudyCategoryId = TopicCategoryId | 'laws';

type StudyItem = {
  key: string;
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
};

const EXPECTED_TOPICS_BY_SCOPE: Record<TopicCategoryId, number> = {
  common: 19,
  specific: 12,
};

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

const CARD_TIER_SEGMENTS: { key: keyof TopicMasteryTiers; barClass: string }[] = [
  { key: 'unseen', barClass: 'bg-white/14' },
  { key: 'fragile', barClass: 'bg-orange-400/92' },
  { key: 'consolidating', barClass: 'bg-amber-300/93' },
  { key: 'solid', barClass: 'bg-lime-200/95' },
  { key: 'mastered', barClass: 'bg-white' },
];

/** Barra apilada en tarjetas de categoría (fondo degradado oscuro). */
const TopicMasteryStackedBar: React.FC<{
  tiers: TopicMasteryTiers;
  totalQuestions: number;
  reduceMotion: boolean | null;
  segments: { key: keyof TopicMasteryTiers; barClass: string }[];
  trackClassName: string;
}> = ({ tiers, totalQuestions, reduceMotion, segments, trackClassName }) => {
  const denom = totalQuestions > 0 ? totalQuestions : tierSum(tiers);
  const pctOf = (n: number) => (denom <= 0 ? 0 : (n / denom) * 100);

  return (
    <div
      className={`flex w-full overflow-hidden rounded-full ${trackClassName}`}
      aria-hidden
    >
      {segments.map(({ key, barClass }) => {
        const w = pctOf(tiers[key]);
        if (w <= 0) return null;
        return (
          <motion.div
            key={key}
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${w}%` }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className={`h-full min-h-0 shrink-0 ${barClass}`}
          />
        );
      })}
    </div>
  );
};

const ROW_TIER_SEGMENTS: { key: keyof TopicMasteryTiers; barClass: string }[] = [
  { key: 'unseen', barClass: 'bg-slate-200' },
  { key: 'fragile', barClass: 'bg-orange-400' },
  { key: 'consolidating', barClass: 'bg-amber-300' },
  { key: 'solid', barClass: 'bg-lime-400' },
  { key: 'mastered', barClass: 'bg-violet-600' },
];

const TIER_PHASE_TITLES: { key: keyof TopicMasteryTiers; label: string }[] = [
  { key: 'unseen', label: 'Sin empezar' },
  { key: 'fragile', label: 'Repaso' },
  { key: 'consolidating', label: 'Practicando' },
  { key: 'solid', label: 'Bien' },
  { key: 'mastered', label: 'Genial' },
];

const tierDotClass = (key: keyof TopicMasteryTiers, variant: 'card' | 'row') => {
  const list = variant === 'card' ? CARD_TIER_SEGMENTS : ROW_TIER_SEGMENTS;
  return list.find((s) => s.key === key)?.barClass ?? 'bg-slate-300';
};

/** Títulos de fase (leyenda); sin párrafos explicativos, solo nombre + color. */
const MasteryPhaseTitles: React.FC<{ variant: 'card' | 'row' }> = ({ variant }) => {
  const textMuted = variant === 'card' ? 'text-white/78' : 'text-slate-500';

  return (
    <div
      className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 ${textMuted}`}
      aria-label="Fases de dominio"
    >
      {TIER_PHASE_TITLES.map(({ key, label }) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-sm ${tierDotClass(key, variant)}`}
            aria-hidden
          />
          <span className="text-[10px] font-bold leading-none tracking-tight">{label}</span>
        </span>
      ))}
    </div>
  );
};

const DashboardStudyTab: React.FC<DashboardContentProps> = ({
  activeLearningContext,
  catalogLoading = false,
  learningDashboardV2,
  onStartCatalogReview,
  onStartLawTraining,
  onStartTopicTraining,
  questionsCount,
}) => {
  const reduceMotion = useReducedMotion();
  const practiceLocked = catalogLoading || questionsCount === 0;
  const [expandedCategory, setExpandedCategory] = useState<StudyCategoryId | null>(null);
  const studyStructure = activeLearningContext?.config.studyStructure ?? 'opposition_topics';

  const categories = useMemo<StudyCategory[]>(() => {
    if (studyStructure === 'law_blocks') {
      const lawBreakdown = sortLaws(learningDashboardV2?.lawBreakdown ?? []);
      const totalQuestions = lawBreakdown.reduce((acc, law) => acc + (law.questionCount ?? 0), 0);
      const consolidatedQuestions = lawBreakdown.reduce(
        (acc, law) => acc + (law.consolidatedCount ?? 0),
        0,
      );
      const totalAttempts = lawBreakdown.reduce((acc, law) => acc + (law.attempts ?? 0), 0);

      return [
        {
          id: 'laws',
          title: 'APRENDER LEYES',
          shortTitle: 'Leyes',
          expectedItemCount: lawBreakdown.length,
          totalQuestions,
          consolidatedQuestions,
          progressPct: safeDivPct(consolidatedQuestions, totalQuestions),
          totalAttempts,
          gradient: 'from-slate-900 to-indigo-700',
          emptyText: 'No hay leyes disponibles para este workspace todavia.',
          showCatalogReview: false,
          items: lawBreakdown.map((law, index) => ({
            key: law.ley_referencia,
            label: law.shortTitle?.trim() || law.ley_referencia,
            description: buildStudyLawDescription(law),
            badge: String(index + 1).padStart(2, '0'),
            progress: safeDivPct(law.consolidatedCount ?? 0, law.questionCount ?? 0),
            consolidatedCount: law.consolidatedCount ?? 0,
            questionCount: law.questionCount ?? 0,
            attempts: law.attempts ?? 0,
            action: () => onStartLawTraining(law.ley_referencia),
            ariaLabel: `Empezar practica de ley: ${law.shortTitle?.trim() || law.ley_referencia}`,
          })),
        },
      ];
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
    learningDashboardV2?.lawBreakdown,
    learningDashboardV2?.topicBreakdown,
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

          return (
            <div key={category.id} className="space-y-3">
              <motion.button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className={`relative w-full overflow-hidden rounded-[32px] bg-gradient-to-br p-6 text-left shadow-xl transition-all duration-500 sm:rounded-[40px] sm:p-8 ${category.gradient} ${
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
                      {category.expectedItemCount} {studyStructure === 'law_blocks' ? 'bloques' : 'temas'} ·{' '}
                      {category.totalQuestions} preguntas
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

                <div className="relative z-10 mt-6 sm:mt-8">
                  {category.masteryTiers && tierSum(category.masteryTiers) > 0 ? (
                    <div>
                      <TopicMasteryStackedBar
                        tiers={category.masteryTiers}
                        totalQuestions={category.totalQuestions}
                        reduceMotion={reduceMotion}
                        segments={CARD_TIER_SEGMENTS}
                        trackClassName="h-2.5 bg-white/12 ring-1 ring-white/25"
                      />
                      <MasteryPhaseTitles variant="card" />
                    </div>
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
              </motion.button>

              <AnimatePresence>
                {isExpanded ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'circOut' }}
                    className="space-y-3 overflow-hidden px-1"
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
                      const rowTiers = item.masteryTiers;
                      const showTierBar =
                        rowTiers !== undefined && tierSum(rowTiers) > 0 && studyStructure !== 'law_blocks';
                      const fallbackBarPct = topicBarDisplayPct(
                        item.progress,
                        item.attempts ?? 0,
                        item.questionCount,
                      );
                      const hasProgress = fallbackBarPct > 0;

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
                                <div>
                                  <TopicMasteryStackedBar
                                    tiers={rowTiers}
                                    totalQuestions={item.questionCount}
                                    reduceMotion={reduceMotion}
                                    segments={ROW_TIER_SEGMENTS}
                                    trackClassName="h-2 bg-slate-100 ring-1 ring-slate-200/90"
                                  />
                                  <MasteryPhaseTitles variant="row" />
                                </div>
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

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                            <Zap className="h-4 w-4 fill-white" />
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
