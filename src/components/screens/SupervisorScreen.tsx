import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, ChevronLeft, CheckCircle2, Settings, Variable as PlayCircle, Database, CalendarIcon, Save, RefreshCw
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { GameState } from '../../types';
import { DAY_OPTIONS } from '../../utils/constants';

type SupervisorScreenProps = {
  isAdmin: boolean;
  startSimulationDay: (idx: number) => void;
  saveChallengeStartDate: (setSaving: (saving: boolean) => void) => Promise<void>;
  resetChallengeStartDate: (setSaving: (saving: boolean) => void) => Promise<void>;
  startSequentialSimulation: () => void;
  stopSequentialSimulation: () => void;
};

const SupervisorScreen: React.FC<SupervisorScreenProps> = React.memo((props) => {
  const {
    isAdmin, startSimulationDay, saveChallengeStartDate, resetChallengeStartDate,
    startSequentialSimulation, stopSequentialSimulation
  } = props;

  const { quizData, setGameState, sequentialSimulationActive, adminStartDateInput, setAdminStartDateInput, challengeStartDate, setProgress } = useAppStore();
  const [activeTab, setActiveTab] = useState<'EZARPENAK' | 'DATU_BASEA'>('EZARPENAK');
  const [supervisorCategory, setSupervisorCategory] = useState<string>('GUZTIAK');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const filteredSupervisorData = useMemo(() => {
    if (supervisorCategory === 'GUZTIAK') return quizData;
    return quizData.filter(cat => cat.capitulo === supervisorCategory);
  }, [supervisorCategory, quizData]);

  const handleBack = () => {
    setGameState(GameState.HOME);
  };

  const clearAllProgress = () => {
    if (window.confirm("Ziur zaude tokiko progresoa ezabatu nahi duzula?")) {
      setProgress([]);
      localStorage.clear(); // We can be brutal in Dev mode to force clean state
      alert("Progresoa tokian ezabatu da.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden"
    >
      {/* Header Fijo */}
      <div className="bg-white px-4 pt-4 pb-2 shadow-sm shrink-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 sm:p-2.5 rounded-xl text-amber-600">
              <Settings className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-800 leading-tight">Ikuskaritza</h2>
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">Admin Modua</p>
            </div>
          </div>
          <button
            onClick={handleBack}
            aria-label="Itzuli atzera"
            title="Itzuli atzera"
            className="p-2 sm:p-3 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          >
            <ChevronLeft strokeWidth={3} size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
          <button
            onClick={() => setActiveTab('EZARPENAK')}
            className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'EZARPENAK' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Settings size={14} /> Ezarpenak
          </button>
          <button
            onClick={() => setActiveTab('DATU_BASEA')}
            className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'DATU_BASEA' ? 'bg-white shadow text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Database size={14} /> Datu-Basea
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 custom-scrollbar relative z-10">
        {activeTab === 'EZARPENAK' && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-lg mx-auto pb-10">
            {/* Global Start Date */}
            <motion.section variants={itemVariants} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <CalendarIcon size={18} />
                <h3 className="font-black uppercase tracking-widest text-xs">Erronkaren Data Globala</h3>
              </div>
              <p className="text-xs text-slate-500 font-bold mb-4">Mundu guztiarentzeako egun bakoitzeko kalkulua noiz hasten den definitzen du. (<strong className="text-slate-800">Gaurkoa: {challengeStartDate}</strong>)</p>

              <div className="flex gap-2">
                <input
                  type="date"
                  aria-label="Kalkulatu hasiera data"
                  value={adminStartDateInput}
                  onChange={(e) => setAdminStartDateInput(e.target.value)}
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-400 outline-none"
                />
                <button
                  disabled={isSavingConfig}
                  aria-label="Gorde"
                  title="Gorde"
                  onClick={() => saveChallengeStartDate(setIsSavingConfig)}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2 flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  <Save size={18} />
                </button>
                <button
                  disabled={isSavingConfig}
                  onClick={() => resetChallengeStartDate(setIsSavingConfig)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl px-4 py-2 flex items-center justify-center disabled:opacity-50 transition-colors"
                  aria-label="Berrezarri defektuzko data"
                  title="Berrezarri defektuzko data"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </motion.section>

            {/* Time Travel Testing */}
            <motion.section variants={itemVariants} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-amber-500">
                <PlayCircle size={18} />
                <h3 className="font-black uppercase tracking-widest text-xs">Simulatu Eguna (Time Travel)</h3>
              </div>
              <p className="text-xs text-slate-500 font-bold mb-4">Gainidatzi denbora eta jolastu zehazki nahi duzun eguneroko galdeketa.</p>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {DAY_OPTIONS.map((dayIdx) => (
                  <button
                    key={dayIdx}
                    onClick={() => startSimulationDay(dayIdx)}
                    className="bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white border border-amber-200 font-black rounded-xl py-2 transition-colors text-sm"
                  >
                    {dayIdx + 1}
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Brutal Tools */}
            <motion.section variants={itemVariants} className="bg-rose-50 border-2 border-dashed border-rose-200 rounded-3xl p-5">
              <h3 className="font-black uppercase tracking-widest text-xs text-rose-600 mb-2">Tokiko datuak</h3>
              <p className="text-xs text-rose-500 font-bold mb-4">Gailu honetako memoria, "hasPlayed" flagak, eta zabor lokala ezabatu.</p>
              <button
                onClick={clearAllProgress}
                className="w-full bg-rose-500 text-white font-bold py-3 rounded-xl hover:bg-rose-600 transition-colors shadow-md"
              >
                GARBITU TOKIKO PROGRESOA
              </button>
            </motion.section>
          </motion.div>
        )}

        {/* Database Tab */}
        {activeTab === 'DATU_BASEA' && (
          <div className="pb-10 h-full flex flex-col">
            <div className="overflow-x-auto pb-4 custom-scrollbar flex gap-2 shrink-0 mb-2 mt-1">
              <button
                onClick={() => setSupervisorCategory('GUZTIAK')}
                className={`px-4 py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase whitespace-nowrap transition-all shadow-sm ${supervisorCategory === 'GUZTIAK'
                  ? 'bg-teal-500 text-white shadow-teal-500/30'
                  : 'bg-white border text-slate-500 border-slate-200 hover:border-teal-300'
                  }`}
              >
                GUZTIAK
              </button>
              {quizData.map((cat) => (
                <button
                  key={cat.capitulo}
                  onClick={() => setSupervisorCategory(cat.capitulo)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase whitespace-nowrap transition-all shadow-sm ${supervisorCategory === cat.capitulo
                    ? 'bg-teal-500 text-white shadow-teal-500/30'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-teal-300'
                    }`}
                >
                  {cat.capitulo}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-4">
              {filteredSupervisorData.length === 0 ? (
                <div className="text-center text-sm text-slate-400 font-bold py-10 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                  Ez dago galderarik kargatuta.
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                  {filteredSupervisorData.map((category) => (
                    <motion.div variants={itemVariants} key={category.capitulo} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                      <div className="bg-slate-800 p-3 sm:p-4 text-white font-black text-xs sm:text-sm uppercase tracking-widest flex items-center justify-between">
                        <span className="truncate pr-4 text-teal-400">{category.capitulo}</span>
                        <span className="bg-white/10 px-2 py-1 rounded text-[10px] shrink-0">
                          {category.preguntas.length} U.
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {category.preguntas.map((q, qIdx) => (
                          <div key={q.id} className="p-4 sm:p-5 transition-colors hover:bg-slate-50/50">
                            <p className="font-bold text-sm sm:text-base text-slate-800 mb-3 leading-snug">
                              <span className="text-teal-500 mr-2">{qIdx + 1}.</span>
                              {q.pregunta}
                            </p>
                            <div className="flex items-start gap-2 bg-teal-50/50 rounded-xl p-3 border border-teal-100/50">
                              <CheckCircle2 strokeWidth={3} className="text-teal-500 w-4 h-4 shrink-0 mt-0.5" />
                              <p className="text-[11px] sm:text-xs text-teal-800 font-bold leading-normal">
                                {q.opciones[q.respuesta_correcta]}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

SupervisorScreen.displayName = 'SupervisorScreen';
export default SupervisorScreen;
