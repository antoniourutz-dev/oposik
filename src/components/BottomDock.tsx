import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { BookOpenCheck, ChartNoAxesColumn, House, LucideIcon, UserRound } from 'lucide-react';

export type MainTab = 'home' | 'stats' | 'study' | 'profile';
type BottomDockVariant = 'default' | 'generic';

type BottomDockProps = {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  variant?: BottomDockVariant;
  /** Cuando hay sesión activa (quiz/review), evita que el dock móvil distraiga. */
  hideOnMobile?: boolean;
  /** Posición sticky del rail en xl cuando no hay TopBar fijo (p. ej. Inicio sin marca). */
  stickyRailTopClass?: string;
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

const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  onChangeTab,
  variant = 'default',
  hideOnMobile = false,
  stickyRailTopClass = 'xl:top-[5.8rem]',
}) => {
  const items = variant === 'generic' ? genericItems : defaultItems;

  return (
    <nav
      aria-label="Navegación principal"
      className={`fixed inset-x-0 bottom-8 z-40 justify-center px-6 sm:px-12 xl:inset-x-auto xl:bottom-auto xl:sticky ${stickyRailTopClass} xl:z-20 xl:self-start xl:px-0 ${
        hideOnMobile ? 'hidden xl:flex' : 'flex'
      }`}
    >
      {/* Mobile: Lumina pill */}
      <div
        className="w-full max-w-md items-center justify-between rounded-[32px] bg-white/80 px-2 py-2 backdrop-blur-[12px] border border-white/50 shadow-2xl xl:hidden flex"
      >
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
              className={`group relative flex flex-col items-center justify-center px-5 py-3 rounded-[24px] transition-all duration-500 ${
                isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon
                size={22}
                aria-hidden="true"
                className={`transition-transform duration-300 ${isActive ? 'mb-1.5 scale-110' : 'group-hover:scale-115'}`}
              />

              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, height: 0, y: 5 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 5 }}
                    className="text-[9px] font-extrabold tracking-wider overflow-hidden"
                  >
                    {item.label.toUpperCase()}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Desktop: existing rail */}
      <div className="hidden xl:block">
        <div
          className="relative flex h-[82px] items-center justify-around gap-2 p-2 xl:h-auto xl:min-h-0 xl:w-[84px] xl:max-w-none xl:flex-col xl:justify-start xl:gap-3 xl:p-3 ui-surface"
        >
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
                    className="absolute inset-0 rounded-[1.8rem] bg-slate-950 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.32)]"
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
      </div>
    </nav>
  );
};

export default BottomDock;
