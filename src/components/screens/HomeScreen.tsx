import React from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy, Lock, Star, Gamepad2, Settings } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

// ---- SUBCOMPONENTE EDUKIA ---- //
const EdukiaCard: React.FC = React.memo(() => {
  const { edukiak, loadingEdukiak, dayIndex } = useAppStore();
  const activeEdukia = edukiak[dayIndex] || null;

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
  timeUntilStart: number;
  formatCountdown: (ms: number) => string;
  isAdmin: boolean;
  onOpenSupervisor: () => void;
  startSequentialSimulation: () => void;
  stopSequentialSimulation: () => void;
  saveChallengeStartDate: (setSaving: (saving: boolean) => void) => Promise<void>;
  resetChallengeStartDate: (setSaving: (saving: boolean) => void) => Promise<void>;
};

const HomeScreen: React.FC<HomeScreenExtractedProps> = React.memo((props) => {
  const {
    loadingRanking, accountIdentity, usernameHistory, pendingUsername, usernameChangeNotice, usernameChangeError, user,
    sequentialSimulationActive, adminStartDateInput, setAdminStartDateInput, isSimulationRun
  } = useAppStore();
  const [isSavingConfig, setIsSavingConfig] = React.useState(false);

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
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center pt-2 sm:pt-6 pb-24 px-4 sm:px-6 relative z-10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full flex flex-col items-center space-y-6"
      >


        {/* Tarjeta de Contenido Educativo */}
        <EdukiaCard />

        {/* Panel de Botón Jugar Gigante */}
        <motion.section variants={itemVariants} className="w-full">
          {props.showDailyPlayButton ? (
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={props.onStartDailyPlay}
                disabled={props.dailyPlayButtonDisabled}
                className="relative group overflow-hidden w-full korrika-bg-gradient text-white px-4 py-6 rounded-3xl font-black text-xl sm:text-2xl leading-none uppercase italic shadow-[0_10px_30px_var(--color-korrika-glow)] hover:scale-[1.02] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <Play className="fill-current" />
                  {props.validatingDailyStart
                    ? 'Egiaztatzen...'
                    : props.nextAvailableDay === -4
                      ? `ITXARON: ${props.formatCountdown(props.timeUntilStart)}`
                      : props.nextAvailableDay === -1 || props.nextAvailableDay === -2
                        ? 'GAURKOA EGINA'
                        : `JOLASTU ABIATU (${props.nextAvailableDay + 1}. EGUNA)`}
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
              <p className="text-sm font-medium text-slate-500 mt-1">Eskerrik asko parte hartzeagatik!</p>
            </div>
          )}
        </motion.section>



        {/* Tablero Administrativo (Kudeaketa Panela) */}
        {props.isAdmin && (
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-[#FFFAF0] border border-amber-200 rounded-[20px] p-5">
              <h2 className="text-[13px] font-black uppercase text-amber-700 tracking-[0.15em] mb-4">
                Kudeaketa Panela
              </h2>

              <div className="space-y-3">
                {/* Opcion 1: SIMULAZIO SEKUENTZIALA */}
                <div className="bg-white border border-amber-200/60 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-black text-amber-900 uppercase tracking-widest">
                      Simulazio Sekuentziala
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sequentialSimulationActive ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {sequentialSimulationActive ? 'PIZTUTA' : 'ITZALITA'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={props.startSequentialSimulation}
                      className="flex-[2] bg-[#0E906E] text-white font-black text-[11px] uppercase py-3 rounded-lg shadow-sm hover:bg-[#0c7a5d] active:scale-95 transition-all"
                    >
                      Hasi Simulazioa
                    </button>
                    <button
                      onClick={props.stopSequentialSimulation}
                      className="flex-1 bg-white border border-amber-400 text-amber-600 font-black text-[11px] uppercase py-3 rounded-lg shadow-sm hover:bg-amber-50 active:scale-95 transition-all"
                    >
                      Gelditu
                    </button>
                  </div>
                </div>

                {/* Opcion 2: DATE SELECTOR */}
                <div className="bg-white border border-amber-200/60 rounded-xl p-4 flex flex-col sm:flex-row gap-2 items-center">
                  <div className="flex-1 w-full bg-white border border-amber-200/60 rounded-lg px-3 py-2.5 flex justify-between items-center">
                    <input
                      type="date"
                      aria-label="Data aldatu"
                      title="Data aldatu"
                      value={adminStartDateInput}
                      onChange={(e) => setAdminStartDateInput(e.target.value)}
                      className="w-full outline-none bg-transparent text-sm font-bold text-slate-700"
                    />
                  </div>
                  <div className="flex w-full sm:w-auto gap-2">
                    <button
                      disabled={isSavingConfig}
                      onClick={() => props.saveChallengeStartDate(setIsSavingConfig)}
                      className="flex-1 sm:flex-none bg-[#F59E0B] text-white font-black text-[11px] uppercase py-3 px-5 rounded-lg shadow-sm hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Gorde
                    </button>
                    <button
                      disabled={isSavingConfig}
                      onClick={() => props.resetChallengeStartDate(setIsSavingConfig)}
                      className="flex-1 sm:flex-none bg-white border border-amber-400 text-amber-600 font-black text-[11px] uppercase py-3 px-3 rounded-lg shadow-sm hover:bg-amber-50 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Berrezarri
                    </button>
                  </div>
                </div>

                {/* Opcion 3: SIMULAZIOA STATUS + DATA BASEA */}
                <div className="bg-white border border-amber-200/60 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black text-amber-900 uppercase tracking-widest">
                      Simulazioa Librea
                    </span>
                    <span className={`text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest ${isSimulationRun ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {isSimulationRun ? 'AKTIBATUTA' : 'DESAKTIBATUTA'}
                    </span>
                  </div>

                  <button
                    onClick={props.onOpenSupervisor}
                    className="bg-slate-800 text-white font-black text-[10px] uppercase px-4 py-2 rounded-lg shadow-sm hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    Datu-Basea Ireki
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
});

HomeScreen.displayName = 'HomeScreen';
export default HomeScreen;
