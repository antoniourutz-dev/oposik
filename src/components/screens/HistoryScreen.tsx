import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Lock } from 'lucide-react';
import { DAYS_COUNT } from '../../utils/constants';

type HistoryScreenProps = {
    completedDayIndexes: number[];
    onReviewDay: (dayIndex: number) => void;
    nextAvailableDay: number;
    currentChallengeDayIndex: number;
};

const HistoryScreen: React.FC<HistoryScreenProps> = React.memo(({ completedDayIndexes, onReviewDay, nextAvailableDay, currentChallengeDayIndex }) => {
    const todayUnlockedIndex =
        nextAvailableDay === -5
            ? DAYS_COUNT - 1
            :
        nextAvailableDay === -1 || nextAvailableDay === -2
            ? currentChallengeDayIndex
            : nextAvailableDay;

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-6 overflow-y-auto custom-scrollbar">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-6"
            >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                        <Calendar size={12} />
                        Ibilbidea
                    </div>
                    <h2 className="mt-3 text-3xl font-black uppercase italic tracking-tight text-slate-900">
                        Ibilbidea
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        Jokatutako egunak hemen berrikusi ahal izango dituzu.
                    </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] bg-sky-100 text-sky-600 shadow-inner">
                    <Calendar size={24} strokeWidth={2.5} />
                </div>
            </div>

            <section className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
                {Array.from({ length: DAYS_COUNT }).map((_, idx) => {
                    const isCompleted = completedDayIndexes.includes(idx);
                    const isAvailable = todayUnlockedIndex >= 0 && idx <= todayUnlockedIndex;
                    const isLocked = !isCompleted;

                    return (
                        <button
                            key={idx}
                            onClick={() => isCompleted && onReviewDay(idx)}
                            disabled={!isCompleted}
                            className={`aspect-square rounded-[1.55rem] border px-3 py-3 transition-all ${
                                isCompleted
                                    ? 'border-emerald-400 bg-white shadow-[0_16px_40px_-30px_rgba(16,185,129,0.36)] hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-28px_rgba(16,185,129,0.48)]'
                                    : 'border-slate-200 bg-slate-50 text-slate-400 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.16)]'
                            }`}
                        >
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <p
                                    className={`text-[1rem] font-black uppercase tracking-widest ${
                                        isCompleted
                                            ? 'text-emerald-700'
                                            : 'text-slate-400'
                                    }`}
                                >
                                    {idx + 1}. EG
                                </p>
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                        isCompleted
                                            ? 'border-emerald-500 text-emerald-500'
                                            : 'border-slate-300 text-slate-300'
                                    } mt-4`}
                                >
                                    {isCompleted ? <CheckCircle2 size={15} strokeWidth={2.3} /> : <Lock size={15} strokeWidth={2.1} />}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </section>

            {completedDayIndexes.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center">
                    <Calendar className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="text-base font-black text-slate-700">Oraindik ez duzu egunik jokatu</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">Joan Hasiera atalera eta hasi gaurko erronka.</p>
                </div>
            )}
            </motion.div>
        </div>
    );
});

HistoryScreen.displayName = 'HistoryScreen';
export default HistoryScreen;
