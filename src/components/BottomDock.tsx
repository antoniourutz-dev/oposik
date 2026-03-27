import React from 'react';
import { BookOpenCheck, ChartNoAxesColumn, House, LucideIcon, UserRound } from 'lucide-react';

export type MainTab = 'home' | 'stats' | 'study' | 'profile';

type BottomDockProps = {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
};

type DockItem = {
  id: MainTab;
  label: string;
  icon: LucideIcon;
};

const items: DockItem[] = [
  { id: 'home', label: 'Inicio', icon: House },
  { id: 'stats', label: 'Stats', icon: ChartNoAxesColumn },
  { id: 'study', label: 'Estudio', icon: BookOpenCheck },
  { id: 'profile', label: 'Perfil', icon: UserRound }
];

const BottomDock: React.FC<BottomDockProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[78px] w-full max-w-3xl items-center justify-around rounded-[1.8rem] border border-white/75 bg-white/88 px-2 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-[1.25rem] px-3 py-2 transition-all ${
                isActive
                  ? 'bg-slate-950 text-white shadow-[0_16px_28px_-18px_rgba(15,23,42,0.8)]'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon size={18} />
              <span className="text-[11px] font-black uppercase tracking-[0.12em]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomDock;
