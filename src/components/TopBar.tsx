import React from 'react';
import { Sparkles } from 'lucide-react';

type TopBarProps = {
  title?: string;
  section?: string;
};

const TopBar: React.FC<TopBarProps> = ({ title = 'Oposik', section }) => {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-6 lg:px-8">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-[1.5rem] border border-white/70 bg-white/84 px-4 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.4)] backdrop-blur-xl">
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-tight text-slate-950">{title}</p>
        </div>
        {section ? (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
            <Sparkles size={14} className="text-amber-500" />
            <span>{section}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default TopBar;
