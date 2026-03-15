import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';

type TodayStoryScreenProps = {
  storyDayIndex: number;
  onBack: () => void;
};

const resolveStoryByDay = <T extends { day: number }>(items: T[], storyDayIndex: number) =>
  items.find((item) => item.day === storyDayIndex) ?? items[storyDayIndex] ?? null;

const TodayStoryScreen: React.FC<TodayStoryScreenProps> = React.memo(({ storyDayIndex, onBack }) => {
  const { gaurkoIstoriak, loadingGaurkoIstoriak } = useAppStore(useShallow((state) => ({
    gaurkoIstoriak: state.gaurkoIstoriak,
    loadingGaurkoIstoriak: state.loadingGaurkoIstoriak
  })));

  const activeStory = React.useMemo(
    () => resolveStoryByDay(gaurkoIstoriak, storyDayIndex),
    [gaurkoIstoriak, storyDayIndex]
  );

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col px-4 pb-10 pt-4 sm:px-6 sm:pt-6 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
              <Sparkles size={12} />
              Gaurko istoria
            </div>
            <h2 className="mt-3 text-3xl font-black uppercase italic tracking-tight text-slate-900">
              Irakurri gaurko pasartea
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Egun honetako kontakizuna lasai irakurtzeko pantaila.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Itzuli"
            title="Itzuli"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        </div>

        <section className="glassmorphism overflow-hidden rounded-[2rem] border border-white/70 p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] sm:p-8">
          {loadingGaurkoIstoriak ? (
            <div className="animate-pulse space-y-4">
              <div className="h-3 w-32 rounded-full bg-sky-100" />
              <div className="h-8 w-3/4 rounded-2xl bg-slate-200" />
              <div className="space-y-3">
                <div className="h-3 rounded-full bg-slate-200" />
                <div className="h-3 rounded-full bg-slate-200" />
                <div className="h-3 w-5/6 rounded-full bg-slate-200" />
                <div className="h-3 w-4/6 rounded-full bg-slate-200" />
              </div>
            </div>
          ) : activeStory ? (
            <div className="relative">
              <div className="absolute right-0 top-0 text-sky-100/80">
                <BookOpen size={88} strokeWidth={1.5} />
              </div>
              <div className="relative z-10">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
                  {storyDayIndex + 1}. eguna
                </p>
                <h3 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                  {activeStory.title}
                </h3>
                <div className="mt-6 rounded-[1.75rem] border border-sky-100 bg-white/80 p-5 shadow-inner sm:p-6">
                  <p className="whitespace-pre-line text-base font-medium leading-8 text-slate-700 sm:text-lg">
                    {activeStory.content}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 px-5 py-10 text-center">
              <BookOpen className="mx-auto text-slate-300" size={36} />
              <p className="mt-4 text-lg font-black text-slate-700">
                Ez dago gaurko istoriorik egun honetarako.
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Edukia kargatuta dagoenean hemen irakurri ahal izango da.
              </p>
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
});

TodayStoryScreen.displayName = 'TodayStoryScreen';

export default TodayStoryScreen;
