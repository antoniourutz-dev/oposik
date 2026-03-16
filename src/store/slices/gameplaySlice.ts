import { StateCreator } from 'zustand';
import { GameState, PlayMode, Question, Player } from '../../types';

export interface GameplaySlice {
    currentTab: 'home' | 'history' | 'ranking' | 'edukiak';
    gameState: GameState;
    playMode: PlayMode;
    dayIndex: number;
    currentQuestionIdx: number;
    dailyPlayLockMessage: string | null;
    activeQuestions: Question[];

    players: Player[];
    currentPlayerIdx: number;
    tempPlayerNames: string[];

    setCurrentTab: (tab: 'home' | 'history' | 'ranking' | 'edukiak') => void;
    setGameState: (state: GameState) => void;
    setPlayMode: (mode: PlayMode) => void;
    setDayIndex: (idx: number) => void;
    setCurrentQuestionIdx: (idx: number | ((prev: number) => number)) => void;
    setDailyPlayLockMessage: (msg: string | null) => void;
    setActiveQuestions: (questions: Question[]) => void;
    setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
    setCurrentPlayerIdx: (idx: number | ((prev: number) => number)) => void;
    setTempPlayerNames: (names: string[] | ((prev: string[]) => string[])) => void;
}

export const createGameplaySlice: StateCreator<GameplaySlice, [], [], GameplaySlice> = (set) => ({
    currentTab: 'home',
    gameState: GameState.AUTH,
    playMode: 'DAILY',
    dayIndex: 0,
    currentQuestionIdx: 0,
    dailyPlayLockMessage: null,
    activeQuestions: [],

    players: [],
    currentPlayerIdx: 0,
    tempPlayerNames: ['Jokalari 1', 'Jokalari 2'],

    setCurrentTab: (currentTab) => set({ currentTab }),
    setGameState: (gameState) => set({ gameState }),
    setPlayMode: (playMode) => set({ playMode }),
    setDayIndex: (dayIndex) => set({ dayIndex }),
    setCurrentQuestionIdx: (idx) => set((s) => ({ currentQuestionIdx: typeof idx === 'function' ? idx(s.currentQuestionIdx) : idx })),
    setDailyPlayLockMessage: (dailyPlayLockMessage) => set({ dailyPlayLockMessage }),
    setActiveQuestions: (activeQuestions) => set({ activeQuestions }),
    setPlayers: (players) => set((s) => ({ players: typeof players === 'function' ? players(s.players) : players })),
    setCurrentPlayerIdx: (idx) => set((s) => ({ currentPlayerIdx: typeof idx === 'function' ? idx(s.currentPlayerIdx) : idx })),
    setTempPlayerNames: (names) => set((s) => ({ tempPlayerNames: typeof names === 'function' ? names(s.tempPlayerNames) : names }))
});
