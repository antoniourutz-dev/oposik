import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Shuffle, Zap } from 'lucide-react';
import type { DashboardContentProps } from './types';

type ThemeCategoryId = 'common' | 'specific';

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const safeDivPct = (num: number, den: number) => (den <= 0 ? 0 : clampPct((num / den) * 100));

const DashboardStudyTab: React.FC<DashboardContentProps> = ({
  catalogLoading = false,
  learningDashboardV2,
  onStartCatalogReview,
  onStartLawTraining,
  questionsCount,
}) => {
  const reduceMotion = useReducedMotion();
  const practiceLocked = catalogLoading || questionsCount === 0;

  // En el concepto Lumina, el temario entra compactado (sin desplegar).
  const [expandedCategory, setExpandedCategory] = useState<ThemeCategoryId | null>(null);

  const lawBreakdown = useMemo(
    () => learningDashboardV2?.lawBreakdown ?? [],
    [learningDashboardV2?.lawBreakdown],
  );

  const topicsByScope = useMemo(() => {
    const commonAll = lawBreakdown.filter((l) => l.scope === 'common');
    const specificAll = lawBreakdown.filter((l) => l.scope === 'specific');

    const sortByWorstFirst = (a: (typeof commonAll)[number], b: (typeof commonAll)[number]) =>
      (a.accuracyRate ?? 0) - (b.accuracyRate ?? 0);

    // Listado: mostramos top por legibilidad (igual que antes).
    const commonTopics = [...commonAll].sort(sortByWorstFirst).slice(0, 12);
    const specificTopics = [...specificAll].sort(sortByWorstFirst).slice(0, 12);

    const sumQuestions = (list: Array<(typeof commonAll)[number]>) =>
      list.reduce((acc, l) => acc + (l.questionCount ?? 0), 0);

    const sumConsolidated = (list: Array<(typeof commonAll)[number]>) =>
      list.reduce((acc, l) => acc + (l.consolidatedCount ?? 0), 0);

    // Totales/progreso: usamos TODO (no el top 12),
    // para que el contador refleje el scope real (~500) y no un subconjunto.
    return {
      common: {
        id: 'common' as const,
        title: 'TEMARIO COMÚN',
        topics: commonTopics,
        totalQuestions: sumQuestions(commonAll),
        consolidatedQuestions: sumConsolidated(commonAll),
        progressPct: safeDivPct(sumConsolidated(commonAll), sumQuestions(commonAll)),
        gradient: 'from-violet-500 to-indigo-600',
      },
      specific: {
        id: 'specific' as const,
        title: 'TEMARIO ESPECÍFICO',
        topics: specificTopics,
        totalQuestions: sumQuestions(specificAll),
        consolidatedQuestions: sumConsolidated(specificAll),
        progressPct: safeDivPct(sumConsolidated(specificAll), sumQuestions(specificAll)),
        gradient: 'from-emerald-500 to-teal-600',
      },
    };
  }, [lawBreakdown]);

  const totalQuestionsAll = topicsByScope.common.totalQuestions + topicsByScope.specific.totalQuestions;

  const categories = [topicsByScope.common, topicsByScope.specific];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6 pb-14"
    >
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tu Temario</h3>
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-600">{totalQuestionsAll} Preguntas totales</span>
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
                className={`w-full p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] text-left relative overflow-hidden shadow-xl transition-all duration-500 bg-gradient-to-br ${cat.gradient} ${
                  isExpanded ? 'ring-4 ring-slate-900/10 ring-offset-4 scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
              >
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Zap className="w-20 h-20 text-white" />
                </div>

                <div className="relative z-10 flex justify-between items-center">
                  <div className="space-y-1">
                    <h4 className="text-white/80 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                      {cat.totalQuestions} Preguntas · {cat.progressPct}% consolidadas
                    </h4>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{cat.title}</h3>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md p-2 rounded-2xl border border-white/20">
                    <ChevronRight
                      className={`w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-300 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 relative z-10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-white text-xs sm:text-sm font-bold">Consolidación</span>
                    <span className="text-lg sm:text-xl font-black text-white">{cat.progressPct}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.progressPct}%` }}
                      className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'circOut' }}
                    className="overflow-hidden space-y-3 px-1"
                  >
                    <motion.button
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="button"
                      onClick={() => onStartCatalogReview(cat.id)}
                      disabled={practiceLocked}
                      className="w-full py-4 bg-slate-100 text-slate-900 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors disabled:opacity-45 disabled:pointer-events-none"
                    >
                      <Shuffle className="w-4 h-4" />
                      Estudiar todo el bloque
                    </motion.button>

                    {cat.topics.length === 0 ? (
                      <div className="w-full rounded-[24px] border border-slate-100 bg-white p-5 text-slate-500 font-semibold text-sm">
                        No hay temas disponibles para este bloque todavía.
                      </div>
                    ) : null}

                    {cat.topics.map((topic, idx) => {
                      const id = idx + 1;
                      const progress = safeDivPct(topic.consolidatedCount ?? 0, topic.questionCount ?? 0);
                      const hasProgress = progress > 0;

                      return (
                        <motion.button
                          key={`${cat.id}:${topic.ley_referencia}:${id}`}
                          initial={reduceMotion ? false : { x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          type="button"
                          onClick={() => onStartLawTraining(topic.ley_referencia)}
                          disabled={practiceLocked}
                          className="w-full max-w-full bg-white rounded-[24px] border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow group text-left disabled:opacity-45 disabled:pointer-events-none min-h-[84px] px-4 py-4 sm:min-h-[92px] sm:px-5 sm:py-5"
                          aria-label={`Empezar test del tema: ${topic.ley_referencia}`}
                        >
                          <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                            <span className="text-sm font-black tabular-nums">{id}</span>
                          </div>

                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h5 className="text-sm font-bold text-slate-800 mb-2 truncate">
                              {topic.ley_referencia}
                            </h5>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={reduceMotion ? false : { width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  className={`h-full rounded-full ${hasProgress ? 'bg-violet-500' : 'bg-slate-200'}`}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 w-8">{progress}%</span>
                            </div>
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 truncate">
                              {(topic.consolidatedCount ?? 0)}/{topic.questionCount ?? 0} consolidadas
                            </p>
                          </div>

                          <div className="h-11 w-11 shrink-0 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 flex items-center justify-center">
                            <Zap className="w-4 h-4 fill-white" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DashboardStudyTab;

