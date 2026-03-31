import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { MainTab } from '../../components/BottomDock';

/** Evita la pestaña de estadísticas para jugador genérico (misma regla que el efecto original). */
export const usePracticeGenericPlayerTabGuard = (
  isGenericPlayer: boolean,
  activeTab: MainTab,
  setActiveTab: Dispatch<SetStateAction<MainTab>>,
) => {
  useEffect(() => {
    if (isGenericPlayer && activeTab === 'stats') {
      setActiveTab('home');
    }
  }, [activeTab, isGenericPlayer, setActiveTab]);
};
