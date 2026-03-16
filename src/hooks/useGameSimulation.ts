import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { GameState } from '../types';
import { adminSetChallengeStartDate } from '../services/adminApi';
import { writeLocalCache } from '../utils/localCache';
import {
    START_DATE_CACHE_KEY,
    DEFAULT_CHALLENGE_START_DATE,
    DAYS_COUNT,
    LEADERBOARDS_CACHE_KEY,
    PROGRESS_STORAGE_PREFIX,
    USER_DAILY_PLAYS_CACHE_PREFIX
} from '../utils/constants';
import { getChallengeDayUnlockAt } from '../utils/helpers';
import { useShallow } from 'zustand/react/shallow';

export const useGameSimulation = (
    isAdmin: boolean,
    userDisplayName: string,
    generateQuestions: (mode: 'DAILY', idx: number) => any[]
) => {
    const {
        challengeStartDate, adminStartDateInput, sequentialSimulationActive, sequentialSimulationDay,
        setChallengeStartDate, setAdminStartDateInput, setReviewDayIndex, setIsSimulationRun,
        setPlayMode, setDayIndex, setActiveQuestions, setPlayers, setCurrentPlayerIdx,
        setCurrentQuestionIdx, setGameState, setSequentialSimulationActive, setSequentialSimulationDay,
        setSequentialSimulationProgress, setProgress, setUserDailyPlays, setLeaderboardRows,
        fetchLeaderboards, fetchUserDailyPlays, user
    } = useAppStore(useShallow((state) => ({
        user: state.user,
        challengeStartDate: state.challengeStartDate,
        adminStartDateInput: state.adminStartDateInput,
        sequentialSimulationActive: state.sequentialSimulationActive,
        sequentialSimulationDay: state.sequentialSimulationDay,
        setChallengeStartDate: state.setChallengeStartDate,
        setAdminStartDateInput: state.setAdminStartDateInput,
        setReviewDayIndex: state.setReviewDayIndex,
        setIsSimulationRun: state.setIsSimulationRun,
        setPlayMode: state.setPlayMode,
        setDayIndex: state.setDayIndex,
        setActiveQuestions: state.setActiveQuestions,
        setPlayers: state.setPlayers,
        setCurrentPlayerIdx: state.setCurrentPlayerIdx,
        setCurrentQuestionIdx: state.setCurrentQuestionIdx,
        setGameState: state.setGameState,
        setSequentialSimulationActive: state.setSequentialSimulationActive,
        setSequentialSimulationDay: state.setSequentialSimulationDay,
        setSequentialSimulationProgress: state.setSequentialSimulationProgress,
        setProgress: state.setProgress,
        setUserDailyPlays: state.setUserDailyPlays,
        setLeaderboardRows: state.setLeaderboardRows,
        fetchLeaderboards: state.fetchLeaderboards,
        fetchUserDailyPlays: state.fetchUserDailyPlays
    })));

    const simulationToday = useMemo(() => {
        if (!sequentialSimulationActive) return null;
        return getChallengeDayUnlockAt(challengeStartDate, sequentialSimulationDay);
    }, [sequentialSimulationActive, sequentialSimulationDay, challengeStartDate]);

    const resetChallengeBrowserData = useCallback(() => {
        setProgress([]);
        setUserDailyPlays([]);
        setLeaderboardRows([]);
        localStorage.removeItem(LEADERBOARDS_CACHE_KEY);

        Object.keys(localStorage).forEach((key) => {
            if (
                key.startsWith(`${PROGRESS_STORAGE_PREFIX}_`) ||
                key.startsWith(`${USER_DAILY_PLAYS_CACHE_PREFIX}_`)
            ) {
                localStorage.removeItem(key);
            }
        });
    }, [setLeaderboardRows, setProgress, setUserDailyPlays]);

    const saveChallengeStartDate = useCallback(async (setSavingAdminConfig: (saving: boolean) => void) => {
        if (!isAdmin) return;
        const value = adminStartDateInput.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
        try {
            setSavingAdminConfig(true);
            const resetBeforeIso = getChallengeDayUnlockAt(value, 0).toISOString();
            const result = await adminSetChallengeStartDate(value, resetBeforeIso);
            setChallengeStartDate(result.saved_start_date);
            setAdminStartDateInput(result.saved_start_date);
            writeLocalCache(START_DATE_CACHE_KEY, result.saved_start_date);
            resetChallengeBrowserData();
            await Promise.all([
                fetchLeaderboards(true),
                user?.id ? fetchUserDailyPlays(user.id, true) : Promise.resolve()
            ]);
        } catch (err) {
            console.error('Error saving global start date:', err);
        } finally {
            setSavingAdminConfig(false);
        }
    }, [
        adminStartDateInput,
        fetchLeaderboards,
        fetchUserDailyPlays,
        isAdmin,
        resetChallengeBrowserData,
        setAdminStartDateInput,
        setChallengeStartDate,
        user?.id
    ]);

    const resetChallengeStartDate = useCallback(async (setSavingAdminConfig: (saving: boolean) => void) => {
        if (!isAdmin) return;
        try {
            setSavingAdminConfig(true);
            const resetBeforeIso = getChallengeDayUnlockAt(DEFAULT_CHALLENGE_START_DATE, 0).toISOString();
            const result = await adminSetChallengeStartDate(DEFAULT_CHALLENGE_START_DATE, resetBeforeIso);
            setChallengeStartDate(result.saved_start_date);
            setAdminStartDateInput(result.saved_start_date);
            writeLocalCache(START_DATE_CACHE_KEY, result.saved_start_date);
            resetChallengeBrowserData();
            await Promise.all([
                fetchLeaderboards(true),
                user?.id ? fetchUserDailyPlays(user.id, true) : Promise.resolve()
            ]);
        } catch (err) {
            console.error('Error resetting global start date:', err);
        } finally {
            setSavingAdminConfig(false);
        }
    }, [
        fetchLeaderboards,
        fetchUserDailyPlays,
        isAdmin,
        resetChallengeBrowserData,
        setAdminStartDateInput,
        setChallengeStartDate,
        user?.id
    ]);

    const startSimulationDay = useCallback((idx: number) => {
        if (!isAdmin) return;
        const clampedIdx = Math.min(Math.max(idx, 0), DAYS_COUNT - 1);
        const qs = generateQuestions('DAILY', clampedIdx);
        if (qs.length === 0) return;

        setReviewDayIndex(null);
        setIsSimulationRun(true);
        setPlayMode('DAILY');
        setDayIndex(clampedIdx);
        setActiveQuestions(qs);

        setPlayers([{ name: userDisplayName || 'SIMULAZIOA', score: 0, answers: [] }]);
        setCurrentPlayerIdx(0);
        setCurrentQuestionIdx(0);
        setGameState(GameState.COUNTDOWN);
    }, [generateQuestions, isAdmin, userDisplayName, setReviewDayIndex, setIsSimulationRun, setPlayMode, setDayIndex, setActiveQuestions, setPlayers, setCurrentPlayerIdx, setCurrentQuestionIdx, setGameState]);

    const startSequentialSimulation = useCallback(() => {
        if (!isAdmin) return;
        setSequentialSimulationActive(true);
        setSequentialSimulationDay(0);
        setSequentialSimulationProgress([]);
        setIsSimulationRun(false);
        setReviewDayIndex(null);
        setGameState(GameState.HOME);
    }, [isAdmin, setSequentialSimulationActive, setSequentialSimulationDay, setSequentialSimulationProgress, setIsSimulationRun, setReviewDayIndex, setGameState]);

    const stopSequentialSimulation = useCallback(() => {
        if (!isAdmin) return;
        setSequentialSimulationActive(false);
        setSequentialSimulationDay(0);
        setSequentialSimulationProgress([]);
        setIsSimulationRun(false);
        setReviewDayIndex(null);
    }, [isAdmin, setSequentialSimulationActive, setSequentialSimulationDay, setSequentialSimulationProgress, setIsSimulationRun, setReviewDayIndex]);

    return {
        simulationToday,
        saveChallengeStartDate,
        resetChallengeStartDate,
        startSimulationDay,
        startSequentialSimulation,
        stopSequentialSimulation
    };
};
