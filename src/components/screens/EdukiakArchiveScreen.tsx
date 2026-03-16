import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Lock, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { DAYS_COUNT } from '../../utils/constants';
import TodayStoryScreen from './TodayStoryScreen';

type EdukiakArchiveScreenProps = {
  currentChallengeDayIndex: number;
  nextAvailableDay: number;
};

const resolveContentByDay = <T extends { day: number }>(items: T[], contentDayIndex: number) =>
  items.find((item) => item.day === contentDayIndex) ?? items[contentDayIndex] ?? null;

const getUnlockedDayIndex = (currentChallengeDayIndex: number, nextAvailableDay: number) => {
  if (nextAvailableDay === -5) return DAYS_COUNT - 1;
  if (nextAvailableDay === -1 || nextAvailableDay === -2) return currentChallengeDayIndex;
  return nextAvailableDay >= 0 ? nextAvailableDay : -1;
};

const EdukiakArchiveScreen: React.FC<EdukiakArchiveScreenProps> = React.memo(
  ({ currentChallengeDayIndex, nextAvailableDay }) => {
    const { gaurkoIstoriak, loadingGaurkoIstoriak } = useAppStore(
      useShallow((state) => ({
        gaurkoIstoriak: state.gaurkoIstoriak,
        loadingGaurkoIstoriak: state.loadingGaurkoIstoriak
      }))
    );

    const unlockedDayIndex = React.useMemo(
      () => getUnlockedDayIndex(currentChallengeDayIndex, nextAvailableDay),
      [currentChallengeDayIndex, nextAvailableDay]
    );

    const unlockedIstoriak = React.useMemo(
      () =>
        Array.from({ length: DAYS_COUNT })
          .map((_, dayIndex) => resolveContentByDay(gaurkoIstoriak, dayIndex))
          .filter(
            (item): item is NonNullable<typeof item> =>
              Boolean(item) && item.day >= 0 && item.day <= unlockedDayIndex
          ),
      [gaurkoIstoriak, unlockedDayIndex]
    );

    const [openedStoryDayIndex, setOpenedStoryDayIndex] = React.useState<number | null>(null);

    React.useEffect(() => {
      if (openedStoryDayIndex === null) return;

      const stillAvailable = unlockedIstoriak.some((item) => item.day === openedStoryDayIndex);
      if (!stillAvailable) {
        setOpenedStoryDayIndex(null);
      }
    }, [openedStoryDayIndex, unlockedIstoriak]);

    if (openedStoryDayIndex !== null) {
      return (
        <TodayStoryScreen
          storyDayIndex={openedStoryDayIndex}
          onBack={() => setOpenedStoryDayIndex(null)}
        />
      );
    }

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
                <Sparkles size={12} />
                Istorioen artxiboa
              </div>
              <h2 className="mt-3 text-3xl font-black uppercase italic tracking-tight text-slate-900">
                Gaurko istorioak
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Egun bakoitza iritsi ahala desblokeatuko da. Sakatu eguna istorioa irakurtzeko.
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] bg-sky-100 text-sky-600 shadow-inner">
              <BookOpen size={22} strokeWidth={2.5} />
            </div>
          </div>

          {loadingGaurkoIstoriak ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-[1.55rem] border border-slate-200 bg-white/70"
                />
              ))}
            </div>
          ) : (
            <section className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
              {Array.from({ length: DAYS_COUNT }).map((_, dayIndex) => {
                const istoria = resolveContentByDay(gaurkoIstoriak, dayIndex);
                const isUnlocked = Boolean(istoria) && dayIndex <= unlockedDayIndex;

                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => {
                      if (isUnlocked) {
                        setOpenedStoryDayIndex(dayIndex);
                      }
                    }}
                    disabled={!isUnlocked}
                    className={`aspect-square rounded-[1.55rem] border px-3 py-3 transition-all ${
                      isUnlocked
                        ? 'border-sky-400 bg-white shadow-[0_16px_40px_-30px_rgba(14,165,233,0.4)] hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-28px_rgba(14,165,233,0.52)]'
                        : 'border-slate-200 bg-slate-50 text-slate-400 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.16)]'
                    }`}
                  >
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <p
                        className={`text-[1.05rem] font-black uppercase italic tracking-[0.08em] ${
                          isUnlocked
                            ? 'bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent'
                            : 'text-slate-400'
                        }`}
                      >
                        {dayIndex + 1}. EG
                      </p>
                      <div
                        className={`mt-4 flex h-8 w-8 items-center justify-center rounded-full border ${
                          isUnlocked
                            ? 'border-sky-500 text-sky-500'
                            : 'border-slate-300 text-slate-300'
                        }`}
                      >
                        {isUnlocked ? <BookOpen size={15} strokeWidth={2.3} /> : <Lock size={15} strokeWidth={2.1} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          {unlockedDayIndex < 0 && (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center">
              <Lock className="mx-auto text-slate-300" size={32} />
              <p className="mt-4 text-base font-black text-slate-700">
                Oraindik ez dago istoriorik desblokeatuta.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }
);

EdukiakArchiveScreen.displayName = 'EdukiakArchiveScreen';

export default EdukiakArchiveScreen;
