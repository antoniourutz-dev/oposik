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
      <div className="mx-auto flex h-[76px] w-full max-w-3xl items-center justify-around rounded-[1.7rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,249,255,0.9))] px-2 shadow-[0_26px_62px_-38px_rgba(141,147,242,0.15)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-[1.2rem] border px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 ${
                isActive
                  ? 'border-white/82 bg-[linear-gradient(135deg,rgba(125,211,252,0.22),rgba(165,180,252,0.28))] text-slate-900 shadow-[0_18px_28px_-22px_rgba(141,147,242,0.2)]'
                  : 'border-transparent text-slate-500 hover:-translate-y-0.5 hover:bg-sky-50/70 hover:text-slate-700 active:translate-y-0 active:scale-[0.98]'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomDock;
