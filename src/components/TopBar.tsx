import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

type TopBarProps = {
  userName: string;
  streakDays: number;
};

const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
};

const TopBar: React.FC<TopBarProps> = ({ userName, streakDays }) => {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-6 pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-12 xl:px-16">
      <div
        className="mx-auto flex h-[56px] w-full max-w-2xl items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="relative flex h-14 w-14 items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500/25 via-sky-400/20 to-indigo-500/25 blur-md"
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 text-xl font-black text-white shadow-[0_18px_40px_-30px_rgba(91,33,182,0.5)] border-2 border-white">
              {toInitials(userName)}
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">¡Hola de nuevo!</p>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
              {userName}
            </h1>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-white rounded-full flex items-center gap-2 shadow-sm border border-slate-100">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" aria-hidden="true" />
            <span className="text-sm font-black text-slate-800">{streakDays} días</span>
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
