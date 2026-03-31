import React from 'react';
import { APP_DISPLAY_NAME } from '../appMeta';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

type TopBarProps = {
  title?: string;
  section?: string;
};

const TopBar: React.FC<TopBarProps> = ({ title = APP_DISPLAY_NAME, section }) => {
  const isIntegrated = !section;

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-6 pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-12 xl:px-16">
      <div
        className={`${
          isIntegrated
            ? 'mx-auto flex h-[48px] w-full max-w-7xl items-center justify-between'
            : 'mx-auto flex h-[64px] w-full max-w-7xl items-center justify-between px-6 transition-all duration-500 hover:bg-white/70 ui-surface'
        }`}
      >
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="relative flex h-8 w-8 items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-xl bg-gradient-to-tr from-indigo-500/20 via-sky-400/20 to-indigo-500/20 blur-md"
            />
            <div className="relative h-2.5 w-2.5 rounded-full bg-slate-950 shadow-[0_0_12px_rgba(15,23,42,0.4)]" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-950 opacity-90">{title}</h1>
        </div>

        {section && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 shadow-sm transition-transform hover:-translate-y-0.5">
              <Sparkles size={14} className="text-indigo-400" />
              <span>{section}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
