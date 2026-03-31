import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { MainTab } from '../../components/BottomDock';

export const guardGenericPlayerActiveTab = (
  isGenericPlayer: boolean,
  activeTab: MainTab,
): MainTab => {
  // Regla existente: para jugador genérico no se permite quedarse en la pestaña de estadísticas.
  if (isGenericPlayer && activeTab === 'stats') return 'home';
  return activeTab;
};

/**
 * Navegación del "shell" de práctica.
 *
 * Responsable de:
 * - estado local `activeTab`
 * - reglas de guard/condiciones de navegación cercanas a ese estado
 *
 * Mantiene la misma semántica que el hook anterior (`usePracticeGenericPlayerTabGuard`),
 * pero centralizando la gestión del tab en una única unidad.
 */
export const usePracticeShellNavigation = (isGenericPlayer: boolean) => {
  const [activeTab, setActiveTab] = useState<MainTab>('home');

  useEffect(() => {
    // Mismo comportamiento que el hook anterior:
    // si el usuario intenta entrar en `stats` siendo jugador genérico, se corrige a `home`.
    if (isGenericPlayer && activeTab === 'stats') setActiveTab('home');
  }, [activeTab, isGenericPlayer]);

  return {
    activeTab,
    setActiveTab: setActiveTab as Dispatch<SetStateAction<MainTab>>,
  };
};

