import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, ChevronLeft } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { GameState } from '../../types';

const RankingScreen: React.FC = React.memo(() => {
  const { players, setGameState } = useAppStore();

  const sortedPlayersByScore = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  const handleBack = () => setGameState(GameState.HOME);

  // Variantes para animación en cascada de la lista
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 150 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col pt-4 pb-6 overflow-hidden relative"
    >
      {/* Background Blurs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div className="absolute top-[10%] left-[10%] w-[30vh] h-[30vh] bg-yellow-400/10 rounded-full blur-[80px]"></div>
        <div className="absolute top-[40%] right-[5%] w-[40vh] h-[40vh] bg-pink-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="text-center px-4 mb-6 sm:mb-8 pt-2">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 0.1 }}
          className="inline-flex items-center justify-center p-3 sm:p-4 bg-yellow-100 rounded-2xl mb-4 shadow-sm"
        >
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" strokeWidth={2.5} />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase italic text-pink-500 drop-shadow-sm">Sailkapena</h2>
        <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-widest mt-2">
          Lehiaketaren Azken Emaitzak
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-auto px-4 pb-8 custom-scrollbar space-y-3 sm:space-y-4"
      >
        {sortedPlayersByScore.map((player, idx) => {
          const isWinner = idx === 0;
          const isSecond = idx === 1;
          const isThird = idx === 2;

          let rankColorClass = "text-gray-300";
          let bgClass = "bg-white/80 border-gray-100";

          if (isWinner) {
            rankColorClass = "text-yellow-500";
            bgClass = "bg-gradient-to-r from-yellow-50 to-white border-yellow-200 shadow-yellow-100/50";
          } else if (isSecond) {
            rankColorClass = "text-gray-400";
            bgClass = "bg-gradient-to-r from-gray-50 to-white border-gray-200";
          } else if (isThird) {
            rankColorClass = "text-amber-600";
            bgClass = "bg-gradient-to-r from-orange-50 to-white border-orange-100";
          }

          return (
            <motion.div
              variants={itemVariants}
              key={idx}
              className={`rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md border backdrop-blur-md flex items-center justify-between gap-4 transition-all ${bgClass}`}
            >
              <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                <div className={`text-2xl sm:text-3xl font-black w-8 sm:w-10 text-center flex items-center justify-center ${rankColorClass}`}>
                  {isWinner ? <Medal size={28} className="drop-shadow-sm" /> : `${idx + 1}.`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] sm:text-[17px] font-black truncate ${isWinner ? 'text-gray-900' : 'text-gray-700'}`}>
                    {player.name}
                  </p>
                  <p className={`text-xs sm:text-sm font-bold mt-0.5 ${isWinner ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {player.score} {player.score === 1 ? 'puntu' : 'puntu'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className={`text-3xl sm:text-4xl font-black leading-none ${isWinner ? 'text-yellow-500' : 'text-pink-500'}`}>
                  {player.score}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="px-4 pt-4 pb-safe-bottom bg-gray-50/80 backdrop-blur-md relative z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBack}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-500 py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm shadow-sm active:scale-95 transition-all group"
        >
          <ChevronLeft strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
          Itzuli Hasierara
        </motion.button>
      </div>
    </motion.div>
  );
});

RankingScreen.displayName = 'RankingScreen';
export default RankingScreen;
