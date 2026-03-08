import { create } from 'zustand';
import { AuthSlice, createAuthSlice } from './slices/authSlice';
import { GameDataSlice, createGameDataSlice } from './slices/gameDataSlice';
import { GameplaySlice, createGameplaySlice } from './slices/gameplaySlice';
import { ProgressSlice, createProgressSlice } from './slices/progressSlice';

export type AppState = AuthSlice & GameDataSlice & GameplaySlice & ProgressSlice;

export const useAppStore = create<AppState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createGameDataSlice(...a),
    ...createGameplaySlice(...a),
    ...createProgressSlice(...a)
}));
