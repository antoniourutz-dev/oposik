import React from 'react';
import { Sparkles } from 'lucide-react';

type TopBarProps = {
  title?: string;
  section?: string;
};

const TopBar: React.FC<TopBarProps> = ({ title = 'Oposik', section }) => {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-[max(env(safe-area-inset-top),0.55rem)] sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[56px] w-full max-w-7xl items-center justify-between rounded-[1.3rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,249,255,0.9))] px-4 shadow-[0_22px_54px_-42px_rgba(141,147,242,0.15)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_20px_-10px_rgba(141,147,242,0.42)]" />
          <p className="truncate text-[1rem] font-extrabold tracking-[-0.03em] text-slate-950">
            {title}
          </p>
        </div>
        {section ? (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-sky-100/80 bg-[linear-gradient(135deg,rgba(125,211,252,0.1),rgba(165,180,252,0.12))] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-700 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.18)]">
            <Sparkles size={13} className="text-sky-400" />
            <span>{section}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default TopBar;
