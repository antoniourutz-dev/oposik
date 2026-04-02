import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpenCheck, ChevronRight, Shuffle, Zap } from 'lucide-react';
import type { PracticeTopicPerformance } from '../../practiceTypes';
import type { DashboardContentProps } from './types';

type TopicCategoryId = 'common' | 'specific';

const EXPECTED_TOPICS_BY_SCOPE: Record<TopicCategoryId, number> = {
  common: 19,
  specific: 12,
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const safeDivPct = (num: number, den: number) => (den <= 0 ? 0 : clampPct((num / den) * 100));
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

const DashboardStudyTab: React.FC<DashboardContentProps> = ({
  catalogLoading = false,
  learningDashboardV2,
  onStartCatalogReview,
  onStartTopicTraining,
  questionsCount,
}) => {
  const reduceMotion = useReducedMotion();
  const practiceLocked = catalogLoading || questionsCount === 0;
  const [expandedCategory, setExpandedCategory] = useState<TopicCategoryId | null>(null);

  const topicBreakdown = useMemo(
    () => learningDashboardV2?.topicBreakdown ?? [],
    [learningDashboardV2?.topicBreakdown],
  );

  const topicsByScope = useMemo(() => {
    const commonAll = sortTopics(
      dedupeTopics(topicBreakdown.filter((topic) => topic.scope === 'common')),
    ).slice(0, EXPECTED_TOPICS_BY_SCOPE.common);
    const specificAll = sortTopics(
      dedupeTopics(topicBreakdown.filter((topic) => topic.scope === 'specific')),
    ).slice(0, EXPECTED_TOPICS_BY_SCOPE.specific);

    const sumQuestions = (list: PracticeTopicPerformance[]) =>
      list.reduce((acc, topic) => acc + (topic.questionCount ?? 0), 0);

    const sumConsolidated = (list: PracticeTopicPerformance[]) =>
      list.reduce((acc, topic) => acc + (topic.consolidatedCount ?? 0), 0);

    return {
      common: {
        id: 'common' as const,
        title: 'TEMARIO COMUN',
        shortTitle: 'Comun',
        topics: commonAll,
        expectedTopicCount: EXPECTED_TOPICS_BY_SCOPE.common,
        totalQuestions: sumQuestions(commonAll),
        consolidatedQuestions: sumConsolidated(commonAll),
        progressPct: safeDivPct(sumConsolidated(commonAll), sumQuestions(commonAll)),
        gradient: 'from-violet-500 to-indigo-600',
      },
      specific: {
        id: 'specific' as const,
        title: 'TEMARIO ESPECIFICO',
        shortTitle: 'Especifico',
        topics: specificAll,
        expectedTopicCount: EXPECTED_TOPICS_BY_SCOPE.specific,
        totalQuestions: sumQuestions(specificAll),
        consolidatedQuestions: sumConsolidated(specificAll),
        progressPct: safeDivPct(sumConsolidated(specificAll), sumQuestions(specificAll)),
        gradient: 'from-emerald-500 to-teal-600',
      },
    };
  }, [topicBreakdown]);

  const totalQuestionsAll =
    topicsByScope.common.totalQuestions + topicsByScope.specific.totalQuestions;
  const totalTopicsAll = EXPECTED_TOPICS_BY_SCOPE.common + EXPECTED_TOPICS_BY_SCOPE.specific;
  const categories = [topicsByScope.common, topicsByScope.specific];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6 pb-14"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-2">
        <div>
          <h3 className="text-[1.9rem] font-black tracking-[-0.04em] text-slate-900">Tu temario</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            {totalQuestionsAll} preguntas
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const isExpanded = expandedCategory === cat.id;

          return (
            <div key={cat.id} className="space-y-3">
              <motion.button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                className={`relative w-full overflow-hidden rounded-[32px] bg-gradient-to-br p-6 text-left shadow-xl transition-all duration-500 sm:rounded-[40px] sm:p-8 ${cat.gradient} ${
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
                      {cat.expectedTopicCount} temas · {cat.totalQuestions} preguntas
                    </h4>
                    <h3 className="text-[1.45rem] font-black tracking-[-0.035em] text-white sm:text-[1.75rem]">
                      {cat.title}
                    </h3>
                    <p className="max-w-[28ch] text-[0.96rem] font-semibold leading-[1.45] text-white/84">
                      {cat.consolidatedQuestions} preguntas consolidadas dentro de{' '}
                      {cat.shortTitle.toLowerCase()}.
                    </p>
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
                  <div className="mb-2 flex items-end justify-between">
                    <span className="text-xs font-bold text-white sm:text-sm">Consolidacion</span>
                    <span className="text-lg font-black text-white sm:text-xl">
                      {cat.progressPct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.progressPct}%` }}
                      className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
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
                    <motion.button
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="button"
                      onClick={() => onStartCatalogReview(cat.id)}
                      disabled={practiceLocked}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-900 transition-colors hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-45"
                    >
                      <Shuffle className="h-4 w-4" />
                      Estudiar todo el bloque
                    </motion.button>

                    {cat.topics.length === 0 ? (
                      <div className="w-full rounded-[24px] border border-slate-100 bg-white p-5 text-sm font-semibold text-slate-500">
                        No hay temas disponibles para este bloque todavia.
                      </div>
                    ) : null}

                    {cat.topics.map((topic, idx) => {
                      const topicNumber = extractTopicOrder(topic.topicLabel);
                      const displayTopicLabel = stripTopicPrefix(topic.topicLabel);
                      const progress = safeDivPct(
                        topic.consolidatedCount ?? 0,
                        topic.questionCount ?? 0,
                      );
                      const hasProgress = progress > 0;

                      return (
                        <motion.button
                          key={`${cat.id}:${topic.topicLabel}`}
                          initial={reduceMotion ? false : { x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.025 }}
                          type="button"
                          onClick={() => onStartTopicTraining(topic.topicLabel)}
                          disabled={practiceLocked}
                          className="group flex min-h-[88px] w-full max-w-full items-center gap-4 rounded-[24px] border border-slate-100 bg-white px-4 py-4 text-left shadow-sm transition-shadow hover:shadow-md disabled:pointer-events-none disabled:opacity-45 sm:min-h-[94px] sm:px-5 sm:py-5"
                          aria-label={`Empezar test del tema: ${displayTopicLabel}`}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-sm font-black tabular-nums text-slate-500 transition-colors group-hover:bg-violet-50 group-hover:text-violet-700">
                            {Number.isFinite(topicNumber) &&
                            topicNumber !== Number.POSITIVE_INFINITY
                              ? String(topicNumber).padStart(2, '0')
                              : '--'}
                          </div>

                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h5 className="truncate text-[0.98rem] font-black tracking-[-0.02em] text-slate-800">
                              {displayTopicLabel}
                            </h5>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <motion.div
                                  initial={reduceMotion ? false : { width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  className={`h-full rounded-full ${
                                    hasProgress ? 'bg-violet-500' : 'bg-slate-200'
                                  }`}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                              <span className="w-8 text-[10px] font-black text-slate-400">
                                {progress}%
                              </span>
                            </div>
                            <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                              {topic.consolidatedCount ?? 0}/{topic.questionCount ?? 0} consolidadas
                            </p>
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
