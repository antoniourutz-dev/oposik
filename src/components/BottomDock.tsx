import React from 'react';
import { BookOpenCheck, ChartNoAxesColumn, House, LucideIcon, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

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
  { id: 'profile', label: 'Perfil', icon: UserRound },
];

const genericItems: DockItem[] = [
  { id: 'home', label: 'Hoy', icon: House },
  { id: 'study', label: 'Test', icon: BookOpenCheck },
  { id: 'profile', label: 'Cuenta', icon: UserRound },
];

const BottomDock: React.FC<BottomDockProps> = ({ activeTab, onChangeTab, variant = 'default' }) => {
  const items = variant === 'generic' ? genericItems : defaultItems;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-6 sm:px-12 xl:inset-x-auto xl:bottom-auto xl:sticky xl:top-[5.8rem] xl:z-20 xl:self-start xl:px-0"
    >
      <div className="relative flex h-[82px] items-center justify-around gap-2 p-2 xl:h-auto xl:min-h-0 xl:w-[84px] xl:max-w-none xl:flex-col xl:justify-start xl:gap-3 xl:p-3 ui-surface">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChangeTab(item.id)}
              className={`group relative flex h-[62px] w-[64px] flex-col items-center justify-center gap-1 transition-all duration-300 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] xl:h-[72px] xl:w-full ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDockIndicator"
                  className="absolute inset-0 rounded-[1.8rem] bg-slate-950 shadow-[0_12px_24px_-10px_rgba(15,23,42,0.4)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-1">
                <Icon
                  size={20}
                  aria-hidden="true"
                  className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-115'}`}
                />
                <span
                  aria-hidden="true"
                  className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomDock;
