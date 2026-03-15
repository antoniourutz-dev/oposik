import { StateCreator } from 'zustand';
import { QuizData } from '../../types';
import { KorrikaEdukia, getRegisteredPlayers, getQuizData, getEdukiak, getGlobalStartDate } from '../../services/korrikaApi';
import { readLocalCache, writeLocalCache, removeLocalCache } from '../../utils/localCache';
import {
    PLAYERS_CACHE_KEY, PLAYERS_CACHE_TTL_MS,
    EDUKIAK_CACHE_KEY, EDUKIAK_CACHE_TTL_MS,
    GAURKO_ISTORIAK_CACHE_KEY,
    QUIZ_CACHE_KEY, QUIZ_CACHE_TTL_MS,
    START_DATE_CACHE_KEY, START_DATE_CACHE_TTL_MS,
    GLOBAL_CONFIG_TABLE, START_DATE_CONFIG_KEY, DEFAULT_CHALLENGE_START_DATE,
    DAYS_COUNT
} from '../../utils/constants';
import { reqCache } from '../apiCache';

export interface GameDataSlice {
    quizData: QuizData[];
    loadingData: boolean;
    edukiak: KorrikaEdukia[];
    loadingEdukiak: boolean;
    gaurkoIstoriak: KorrikaEdukia[];
    loadingGaurkoIstoriak: boolean;
    registeredPlayers: string[];
    challengeStartDate: string;
    adminStartDateInput: string;

    setLoadingData: (loading: boolean) => void;
    setQuizData: (data: QuizData[]) => void;
    setRegisteredPlayers: (players: string[]) => void;
    setEdukiak: (edukiak: KorrikaEdukia[]) => void;
    setLoadingEdukiak: (loading: boolean) => void;
    setGaurkoIstoriak: (gaurkoIstoriak: KorrikaEdukia[]) => void;
    setLoadingGaurkoIstoriak: (loading: boolean) => void;
    setChallengeStartDate: (date: string) => void;
    setAdminStartDateInput: (date: string) => void;

    fetchRegisteredPlayers: (force?: boolean) => Promise<void>;
    fetchEdukiak: (force?: boolean) => Promise<void>;
    fetchGaurkoIstoriak: (force?: boolean) => Promise<void>;
    fetchQuizData: (force?: boolean) => Promise<void>;
    fetchGlobalStartDate: (force?: boolean) => Promise<void>;
}

export const createGameDataSlice: StateCreator<GameDataSlice, [], [], GameDataSlice> = (set) => ({
    quizData: [],
    loadingData: true,
    edukiak: [],
    loadingEdukiak: false,
    gaurkoIstoriak: [],
    loadingGaurkoIstoriak: false,
    registeredPlayers: [],
    challengeStartDate: DEFAULT_CHALLENGE_START_DATE,
    adminStartDateInput: DEFAULT_CHALLENGE_START_DATE,

    setLoadingData: (loadingData) => set({ loadingData }),
    setQuizData: (quizData) => set({ quizData }),
    setRegisteredPlayers: (registeredPlayers) => set({ registeredPlayers }),
    setEdukiak: (edukiak) => set({ edukiak }),
    setLoadingEdukiak: (loadingEdukiak) => set({ loadingEdukiak }),
    setGaurkoIstoriak: (gaurkoIstoriak) => set({ gaurkoIstoriak }),
    setLoadingGaurkoIstoriak: (loadingGaurkoIstoriak) => set({ loadingGaurkoIstoriak }),
    setChallengeStartDate: (challengeStartDate) => set({ challengeStartDate }),
    setAdminStartDateInput: (adminStartDateInput) => set({ adminStartDateInput }),

    fetchRegisteredPlayers: async (force = false) => {
        if (!force) {
            const cached = readLocalCache<string[]>(PLAYERS_CACHE_KEY, PLAYERS_CACHE_TTL_MS);
            if (cached) {
                set({ registeredPlayers: cached });
                return;
            }
        }
        if (reqCache.registeredPlayersRequest) return reqCache.registeredPlayersRequest;

        reqCache.registeredPlayersRequest = (async () => {
            try {
                const names = await getRegisteredPlayers();
                set({ registeredPlayers: names });
                names.length > 0 ? writeLocalCache(PLAYERS_CACHE_KEY, names) : removeLocalCache(PLAYERS_CACHE_KEY);
            } catch {
                set({ registeredPlayers: [] });
                removeLocalCache(PLAYERS_CACHE_KEY);
            }
        })();

        try { await reqCache.registeredPlayersRequest; }
        finally { reqCache.registeredPlayersRequest = null; }
    },

    fetchEdukiak: async (force = false) => {
        if (!force) {
            const cachedEdukiak = readLocalCache<KorrikaEdukia[]>(EDUKIAK_CACHE_KEY, EDUKIAK_CACHE_TTL_MS);
            if (cachedEdukiak) {
                set({ edukiak: cachedEdukiak, loadingEdukiak: false });
                return;
            }
        }

        if (reqCache.edukiaRequest) return reqCache.edukiaRequest;

        reqCache.edukiaRequest = (async () => {
            try {
                set({ loadingEdukiak: true });
                const mapped = await getEdukiak(DAYS_COUNT);
                set({ edukiak: mapped });
                writeLocalCache(EDUKIAK_CACHE_KEY, mapped);
            } catch (err) {
                console.error('Error fetching korrika_edukiak:', err);
                set({ edukiak: [] });
                removeLocalCache(EDUKIAK_CACHE_KEY);
            } finally {
                set({ loadingEdukiak: false });
            }
        })();

        try { await reqCache.edukiaRequest; }
        finally { reqCache.edukiaRequest = null; }
    },

    fetchGaurkoIstoriak: async (force = false) => {
        if (!force) {
            const cachedIstoriak = readLocalCache<KorrikaEdukia[]>(GAURKO_ISTORIAK_CACHE_KEY, EDUKIAK_CACHE_TTL_MS);
            if (cachedIstoriak) {
                set({ gaurkoIstoriak: cachedIstoriak, loadingGaurkoIstoriak: false });
                return;
            }
        }

        if (reqCache.gaurkoIstoriaRequest) return reqCache.gaurkoIstoriaRequest;

        reqCache.gaurkoIstoriaRequest = (async () => {
            try {
                set({ loadingGaurkoIstoriak: true });
                const mapped = await getEdukiak(DAYS_COUNT, 'gaurko_istoria');
                set({ gaurkoIstoriak: mapped });
                mapped.length > 0
                    ? writeLocalCache(GAURKO_ISTORIAK_CACHE_KEY, mapped)
                    : removeLocalCache(GAURKO_ISTORIAK_CACHE_KEY);
            } catch (err) {
                console.error('Error fetching korrika_edukiak (gaurko_istoria):', err);
                set({ gaurkoIstoriak: [] });
                removeLocalCache(GAURKO_ISTORIAK_CACHE_KEY);
            } finally {
                set({ loadingGaurkoIstoriak: false });
            }
        })();

        try { await reqCache.gaurkoIstoriaRequest; }
        finally { reqCache.gaurkoIstoriaRequest = null; }
    },

    fetchQuizData: async (force = false) => {
        if (!force) {
            const cachedQuizData = readLocalCache<QuizData[]>(QUIZ_CACHE_KEY, QUIZ_CACHE_TTL_MS);
            if (cachedQuizData) {
                set({ quizData: cachedQuizData, loadingData: false });
                return;
            }
        }

        if (reqCache.quizDataRequest) return reqCache.quizDataRequest;

        reqCache.quizDataRequest = (async () => {
            try {
                set({ loadingData: true });
                const mappedData = await getQuizData();
                set({ quizData: mappedData });
                writeLocalCache(QUIZ_CACHE_KEY, mappedData);
            } catch (err) {
                console.error("Error fetching quiz data:", err);
                set({ quizData: [] });
                removeLocalCache(QUIZ_CACHE_KEY);
            } finally {
                set({ loadingData: false });
            }
        })();

        try { await reqCache.quizDataRequest; }
        finally { reqCache.quizDataRequest = null; }
    },

    fetchGlobalStartDate: async (force = false) => {
        if (!force) {
            const cachedStartDate = readLocalCache<string>(START_DATE_CACHE_KEY, START_DATE_CACHE_TTL_MS);
            if (cachedStartDate && /^\d{4}-\d{2}-\d{2}$/.test(cachedStartDate)) {
                set({ challengeStartDate: cachedStartDate, adminStartDateInput: cachedStartDate });
                return;
            }
        }

        if (reqCache.globalStartDateRequest) return reqCache.globalStartDateRequest;

        reqCache.globalStartDateRequest = (async () => {
            try {
                const rawValue = await getGlobalStartDate(GLOBAL_CONFIG_TABLE, START_DATE_CONFIG_KEY);
                if (rawValue) {
                    set({ challengeStartDate: rawValue, adminStartDateInput: rawValue });
                    writeLocalCache(START_DATE_CACHE_KEY, rawValue);
                } else {
                    set({ challengeStartDate: DEFAULT_CHALLENGE_START_DATE, adminStartDateInput: DEFAULT_CHALLENGE_START_DATE });
                    removeLocalCache(START_DATE_CACHE_KEY);
                }
            } catch (err) {
                console.error('Error fetching global start date:', err);
                set({ challengeStartDate: DEFAULT_CHALLENGE_START_DATE, adminStartDateInput: DEFAULT_CHALLENGE_START_DATE });
                removeLocalCache(START_DATE_CACHE_KEY);
            }
        })();

        try { await reqCache.globalStartDateRequest; }
        finally { reqCache.globalStartDateRequest = null; }
    }
});
