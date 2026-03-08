import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, UserCheck } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { GameState } from '../../types';

const TurnTransitionScreen: React.FC = React.memo(() => {
  const { players, currentPlayerIdx, setCurrentPlayerIdx, setCurrentQuestionIdx, setGameState } = useAppStore();

  const playerName = players[currentPlayerIdx + 1]?.name ?? 'Jokalaria';

  const handleReady = useCallback(() => {
    setCurrentPlayerIdx((prev) => prev + 1);
    setCurrentQuestionIdx(0);
    setGameState(GameState.COUNTDOWN);
  }, [setCurrentPlayerIdx, setCurrentQuestionIdx, setGameState]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 30 }}
      className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden"
    >
      {/* Background Decorators */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[50%] -right-[50%] w-[100vh] h-[100vh] bg-pink-500/10 rounded-full blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(233,30,99,0.2)] w-full max-w-sm border border-pink-100 relative"
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-pink-50 shadow-pink-200"
          >
            <UserCheck className="w-12 h-12 text-pink-500" strokeWidth={2.5} />
          </motion.div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-gray-400 uppercase tracking-widest mt-12 mb-2">Txanda Berria!</h2>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <p className="text-3xl sm:text-4xl font-black text-pink-500 break-words drop-shadow-sm leading-tight">
            {playerName}
          </p>

          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Prest al zaude?
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReady}
            className="relative overflow-hidden group korrika-bg-gradient text-white w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-pink-500/30 shadow-xl flex items-center justify-center gap-3 transition-all"
          >
            <span className="relative z-10 text-[15px]">PREST NAGO</span>
            <ArrowRight className="group-hover:translate-x-1 transition-transform relative z-10 w-5 h-5" strokeWidth={3} />
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

TurnTransitionScreen.displayName = 'TurnTransitionScreen';
export default TurnTransitionScreen;
