import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, X, ChevronRight, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { GameState } from '../../types';

const PlayerSetupScreen: React.FC = React.memo(() => {
  const {
    tempPlayerNames,
    setTempPlayerNames,
    setPlayers,
    setCurrentPlayerIdx,
    setCurrentQuestionIdx,
    setGameState,
  } = useAppStore();

  const handlePlayerNameChange = useCallback((index: number, value: string) => {
    setTempPlayerNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, [setTempPlayerNames]);

  const handleRemovePlayer = useCallback((index: number) => {
    setTempPlayerNames((prev) => prev.filter((_, idx) => idx !== index));
  }, [setTempPlayerNames]);

  const handleAddPlayer = useCallback(() => {
    setTempPlayerNames((prev) => [...prev, `Jokalari ${prev.length + 1}`]);
  }, [setTempPlayerNames]);

  const handleCancel = useCallback(() => {
    setGameState(GameState.HOME);
  }, [setGameState]);

  const handleStart = useCallback(() => {
    const pList = tempPlayerNames.map((name) => ({
      name: name.trim() || 'Izengabea',
      score: 0,
      answers: [],
    }));

    setPlayers(pList);
    setCurrentPlayerIdx(0);
    setCurrentQuestionIdx(0);
    setGameState(GameState.COUNTDOWN);
  }, [tempPlayerNames, setPlayers, setCurrentPlayerIdx, setCurrentQuestionIdx, setGameState]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="flex-1 flex flex-col p-4 sm:p-6 space-y-6 overflow-hidden relative"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div className="absolute -top-[20%] -right-[10%] w-[50vh] h-[50vh] bg-pink-500/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-[40%] -left-[20%] w-[40vh] h-[40vh] bg-purple-500/10 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="text-center pt-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="inline-flex items-center justify-center p-3 sm:p-4 bg-pink-100/50 rounded-2xl mb-4 backdrop-blur-sm"
        >
          <Users className="w-8 h-8 sm:w-10 sm:h-10 text-pink-500" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase italic text-pink-500 drop-shadow-sm">
          Jokalariak Gehitu
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-widest mt-2 px-4">
          Nork hartuko du lekukoa txanda honetan?
        </p>
      </div>

      <div className="flex-1 overflow-auto px-2 space-y-3 pb-8 custom-scrollbar">
        <AnimatePresence initial={false}>
          {tempPlayerNames.map((name, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 items-center"
            >
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 group-focus-within:text-pink-600 transition-colors">
                  <User size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                  className="w-full bg-white/80 backdrop-blur-md border-2 border-pink-100 rounded-2xl pl-11 px-4 py-4 text-[16px] font-bold text-gray-700 focus:border-pink-400 outline-none hover:shadow-md focus:shadow-lg focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300 placeholder:font-medium"
                  placeholder={`Jokalari ${i + 1}...`}
                />
              </div>

              {tempPlayerNames.length > 2 && (
                <button
                  onClick={() => handleRemovePlayer(i)}
                  className="bg-red-50/80 hover:bg-red-100 backdrop-blur-md text-red-500 w-[54px] h-[58px] flex items-center justify-center rounded-2xl border border-red-100 font-black flex-shrink-0 transition-all active:scale-95 shadow-sm hover:shadow-md group"
                  aria-label="Kendu jokalaria"
                >
                  <X className="group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} size={20} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {tempPlayerNames.length < 4 && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddPlayer}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-pink-200 hover:border-pink-400 rounded-2xl text-pink-400 hover:text-pink-600 bg-pink-50/30 hover:bg-pink-50/50 backdrop-blur-sm font-black text-[13px] sm:text-[14px] uppercase transition-all shadow-sm group mt-4"
          >
            <UserPlus size={18} strokeWidth={2.5} className="group-hover:animate-bounce" />
            + Gehitu Beste Bat
          </motion.button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-safe-bottom">
        <button
          onClick={handleCancel}
          className="flex-1 bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 py-4 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase shadow-sm active:scale-95 transition-all"
        >
          Utzi
        </button>
        <button
          onClick={handleStart}
          className="flex-[2] flex items-center justify-center gap-2 korrika-bg-gradient text-white py-4 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase shadow-pink-500/30 shadow-xl hover:shadow-2xl active:scale-95 transition-all group"
        >
          <span>Hasi Lehia</span>
          <ChevronRight strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
});

PlayerSetupScreen.displayName = 'PlayerSetupScreen';
export default PlayerSetupScreen;
