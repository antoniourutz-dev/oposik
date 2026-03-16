import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bell, BookOpen, Clock3, Play, Trophy, Lock, Star, Shield } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const resolveContentByDay = <T extends { day: number }>(items: T[], contentDayIndex: number) =>
  items.find((item) => item.day === contentDayIndex) ?? items[contentDayIndex] ?? null;

// ---- SUBCOMPONENTE EDUKIA ---- //
type EdukiaCardProps = {
  contentDayIndex: number;
  onOpenGaurkoIstoria: () => void;
};

const EdukiaCard: React.FC<EdukiaCardProps> = React.memo(({ contentDayIndex, onOpenGaurkoIstoria }) => {
  const { edukiak, loadingEdukiak, gaurkoIstoriak, loadingGaurkoIstoriak } = useAppStore(useShallow((state) => ({
    edukiak: state.edukiak,
    loadingEdukiak: state.loadingEdukiak,
    gaurkoIstoriak: state.gaurkoIstoriak,
    loadingGaurkoIstoriak: state.loadingGaurkoIstoriak
  })));
  const activeEdukia = resolveContentByDay(edukiak, contentDayIndex);
  const activeStory = resolveContentByDay(gaurkoIstoriak, contentDayIndex);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="glassmorphism rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Star size={80} />
        </div>
        {loadingEdukiak ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-2 bg-pink-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-2 bg-pink-200 rounded"></div>
                <div className="h-2 bg-pink-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ) : activeEdukia ? (
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-600 mb-3">
              <Star size={12} className="fill-current" />
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest leading-none">
                Eguneko edukia
              </p>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight mb-2">
              {activeEdukia.title}
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              {activeEdukia.content}
            </p>
            <button
              type="button"
              onClick={onOpenGaurkoIstoria}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 transition-all hover:border-sky-300 hover:bg-sky-100"
            >
              <BookOpen size={16} />
              {loadingGaurkoIstoriak ? 'Kargatzen...' : activeStory ? 'Gaurko istorioa' : 'Istorioa irakurri'}
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <Lock size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-bold">Ez dago edukirik egun honetarako.</p>
          </div>
        )}
      </div>
    </motion.section>
  );
});
EdukiaCard.displayName = 'EdukiaCard';

// ---- COMPONENTE PRINCIPAL HOMESCREEN ---- //
type HomeScreenExtractedProps = {
  // Estas son las unicas props externas que el App envia por logica dura local 
  // que es difícil meter a store, como la validación de tiempo local
  showDailyPlayButton: boolean;
  onStartDailyPlay: () => void;
  dailyPlayButtonDisabled: boolean;
  validatingDailyStart: boolean;
  nextAvailableDay: number;
  currentChallengeDayIndex: number;
  timeUntilStart: number;
  formatCountdown: (ms: number) => string;
  dailyPlayLockMessage: string | null;
  isAdmin: boolean;
  showReminderPrompt: boolean;
  enablingReminders: boolean;
  onEnableReminders: () => void;
  onOpenSupervisor: () => void;
  onOpenGaurkoIstoria: () => void;
  startSequentialSimulation: () => void;
  stopSequentialSimulation: () => void;
  saveChallengeStartDate: (setSaving: (saving: boolean) => void) => Promise<void>;
  resetChallengeStartDate: (setSaving: (saving: boolean) => void) => Promise<void>;
};

const HomeScreen: React.FC<HomeScreenExtractedProps> = React.memo((props) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center pt-[22px] sm:pt-6 pb-24 px-4 sm:px-6 relative z-10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full flex flex-col items-center space-y-[22px]"
      >


        {/* Panel de Botón Jugar Gigante */}
        <motion.section variants={itemVariants} className="w-full">
          {props.showDailyPlayButton ? (
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={props.onStartDailyPlay}
                disabled={props.dailyPlayButtonDisabled}
                className="relative group overflow-hidden w-full min-h-[58px] rounded-3xl px-4 py-4 font-black text-lg sm:text-xl leading-none uppercase italic text-white korrika-bg-gradient shadow-[0_18px_34px_-18px_rgba(236,72,153,0.58)] transition-[transform,box-shadow,filter] duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_22px_40px_-18px_rgba(236,72,153,0.68)] active:scale-[0.985] active:shadow-[0_12px_24px_-16px_rgba(236,72,153,0.5)] disabled:opacity-50 disabled:scale-100 disabled:shadow-none touch-manipulation"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {props.nextAvailableDay === -4 ? (
                    <Clock3 className="shrink-0" size={20} />
                  ) : (
                    <Play className="fill-current shrink-0" size={20} />
                  )}
                  {props.validatingDailyStart
                    ? 'Egiaztatzen...'
                    : props.nextAvailableDay === -4
                      ? `Erronka hasiko da: ${props.formatCountdown(props.timeUntilStart)}`
                      : props.nextAvailableDay === -1 || props.nextAvailableDay === -2
                        ? 'Gaurko saioa egina'
                        : `${props.nextAvailableDay + 1}. eguneko jolasa hasi`}
                </span>
              </button>
              {props.dailyPlayLockMessage && (
                <p className="text-xs font-bold text-red-500 text-center bg-red-50 border border-red-100 rounded-2xl px-4 py-3 shadow-inner">
                  {props.dailyPlayLockMessage}
                </p>
              )}
            </div>
          ) : (
            <div className="glassmorphism rounded-3xl p-6 flex flex-col items-center text-center">
              <Trophy size={48} className="text-amber-400 mb-3 drop-shadow-md" />
              <h2 className="text-lg font-black uppercase text-slate-800">
                Erronka Amaituta
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">11 eguneko ibilbidea osatu duzu.</p>
            </div>
          )}
        </motion.section>

        {props.showReminderPrompt && (
          <motion.section variants={itemVariants} className="w-full">
            <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50/80 p-4 shadow-[0_16px_38px_-30px_rgba(14,165,233,0.38)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                  <Bell size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">
                    Oroigarria
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                    10:00etan jakinarazpena jaso dezakezu, baldin eta eguneko saioa oraindik egin ez baduzu.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={props.onEnableReminders}
                disabled={props.enablingReminders}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
              >
                <Bell size={15} />
                {props.enablingReminders ? 'Aktibatzen...' : 'Aktibatu oroigarriak'}
              </button>
            </div>
          </motion.section>
        )}


        {/* Tarjeta de Contenido Educativo */}
        <EdukiaCard
          contentDayIndex={props.currentChallengeDayIndex}
          onOpenGaurkoIstoria={props.onOpenGaurkoIstoria}
        />



        {/* Tablero Administrativo (Kudeaketa Panela) */}
        {props.isAdmin && (
          <motion.div variants={itemVariants} className="w-full">
            <div className="rounded-[20px] border border-amber-200 bg-[#FFFAF0] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Shield size={20} />
                </div>
                <div className="flex-1">
                  <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-amber-800">
                    Ikuskaritza
                  </h2>
                  <p className="mt-2 text-sm font-medium text-amber-900">
                    Erronkaren egutegia, jokalarien datuak eta galdera-bankua toki bakarrean kudeatu.
                  </p>
                </div>
              </div>

              <button
                onClick={props.onOpenSupervisor}
                className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                Ireki ikuskaritza panela
              </button>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
});

HomeScreen.displayName = 'HomeScreen';
export default HomeScreen;
