import React from 'react';
import { BookOpenCheck, ChartNoAxesColumn, House, LucideIcon, UserRound } from 'lucide-react';

export type MainTab = 'home' | 'stats' | 'study' | 'profile';
type BottomDockVariant = 'default' | 'generic';

type BottomDockProps = {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  variant?: BottomDockVariant;
};

type DockItem = {
  id: MainTab;
  label: string;
  icon: LucideIcon;
};

const defaultItems: DockItem[] = [
  { id: 'home', label: 'Inicio', icon: House },
  { id: 'stats', label: 'Stats', icon: ChartNoAxesColumn },
  { id: 'study', label: 'Estudio', icon: BookOpenCheck },
  { id: 'profile', label: 'Perfil', icon: UserRound }
];

const genericItems: DockItem[] = [
  { id: 'home', label: 'Hoy', icon: House },
  { id: 'study', label: 'Test', icon: BookOpenCheck },
  { id: 'profile', label: 'Cuenta', icon: UserRound }
];

const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  onChangeTab,
  variant = 'default'
}) => {
  const items = variant === 'generic' ? genericItems : defaultItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6 lg:px-8">
      <div className="chrome-float mx-auto flex h-[72px] w-full max-w-3xl items-center justify-around rounded-[1.55rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,249,255,0.9))] px-2.5 shadow-[0_22px_52px_-38px_rgba(141,147,242,0.14)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-[1rem] border border-transparent px-2.5 py-1.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:-translate-y-0.5 hover:text-slate-700 active:translate-y-0 active:scale-[0.98]'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-[linear-gradient(135deg,rgba(125,211,252,0.18),rgba(165,180,252,0.24))] shadow-[0_12px_22px_-18px_rgba(141,147,242,0.22)]'
                    : 'bg-transparent group-hover:bg-white/52'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-transform duration-300 ${isActive ? '-translate-y-0.5' : 'group-hover:-translate-y-0.5'}`}
                />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
                {item.label}
              </span>
              <span
                className={`mt-0.5 h-[3px] rounded-full bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] transition-all duration-300 ${
                  isActive ? 'w-5 opacity-100' : 'w-2 opacity-0 group-hover:opacity-45'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomDock;
