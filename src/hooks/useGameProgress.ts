import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
    getCurrentChallengeDayIndex,
    getChallengeDayUnlockAt,
    getLocalDateKey,
    hasChallengeWindowEnded,
    mapStoredAnswersToUserAnswers
} from '../utils/helpers';
import { normalizeUsername } from '../services/accountApi';
import { DAYS_COUNT, LEGACY_ADMIN_USERS } from '../utils/constants';
import { useShallow } from 'zustand/react/shallow';

export const useGameProgress = (referenceNow: Date) => {
    const {
        user,
        accountIdentity,
        challengeStartDate,
        progress,
        userDailyPlays,
        sequentialSimulationActive,
        sequentialSimulationProgress
    } = useAppStore(useShallow((state) => ({
        user: state.user,
        accountIdentity: state.accountIdentity,
        challengeStartDate: state.challengeStartDate,
        progress: state.progress,
        userDailyPlays: state.userDailyPlays,
        sequentialSimulationActive: state.sequentialSimulationActive,
        sequentialSimulationProgress: state.sequentialSimulationProgress
    })));

    const currentUsername = useMemo(() => {
        const identityUsername = normalizeUsername(accountIdentity?.current_username ?? '');
        if (identityUsername) return identityUsername;

        const metadataUsernameRaw = (user?.user_metadata as { username?: string } | undefined)?.username;
        const metadataUsername = normalizeUsername(metadataUsernameRaw ?? '');
        if (metadataUsername) return metadataUsername;

        const fallbackEmailUsername = normalizeUsername(user?.email?.split('@')[0] ?? '');
        return fallbackEmailUsername || 'gonbidatua';
    }, [accountIdentity?.current_username, user?.email, user?.user_metadata]);

    const userDisplayName = currentUsername.toUpperCase();
    const isAdmin = Boolean(accountIdentity?.is_admin) || LEGACY_ADMIN_USERS.includes(currentUsername);
    const challengeStartTs = useMemo(
        () => getChallengeDayUnlockAt(challengeStartDate, 0).getTime(),
        [challengeStartDate]
    );

    const currentChallengeDayIndex = useMemo(() => {
        const now = new Date(referenceNow);
        const unlockedDayIndex = getCurrentChallengeDayIndex(challengeStartDate, now, DAYS_COUNT);
        if (unlockedDayIndex < 0) return -1;
        return Math.min(unlockedDayIndex, DAYS_COUNT - 1);
    }, [challengeStartDate, referenceNow]);

    const effectiveDailyProgress = useMemo(() => {
        if (sequentialSimulationActive) return sequentialSimulationProgress;

        const merged: typeof progress = [];
        progress.forEach((entry) => {
            if (!entry?.completed) return;
            const playedAtTs = new Date(entry.date).getTime();
            if (!Number.isFinite(playedAtTs) || playedAtTs < challengeStartTs) return;
            merged[entry.dayIndex] = entry;
        });

        userDailyPlays.forEach((play) => {
            const playedAtTs = new Date(play.played_at).getTime();
            if (!Number.isFinite(playedAtTs) || playedAtTs < challengeStartTs) return;
            const existing = merged[play.day_index];
            const serverAnswers = mapStoredAnswersToUserAnswers(play.answers ?? []);
            const existingAnswers = existing?.answers ?? [];
            const mergedAnswers = serverAnswers.length > 0 ? serverAnswers : existingAnswers;
            const mergedScore = typeof play.correct_answers === 'number' ? play.correct_answers : existing?.score ?? 0;
            merged[play.day_index] = {
                dayIndex: play.day_index,
                score: mergedScore,
                completed: true,
                date: play.played_at || existing?.date || new Date().toISOString(),
                answers: mergedAnswers,
                players: existing?.players
            };
        });
        return merged;
    }, [challengeStartTs, progress, sequentialSimulationActive, sequentialSimulationProgress, userDailyPlays]);

    const nextAvailableDay = useMemo(() => {
        const now = new Date(referenceNow);
        const sourceProgress = effectiveDailyProgress;

        if (currentChallengeDayIndex < 0) return -4;
        if (hasChallengeWindowEnded(challengeStartDate, now, DAYS_COUNT)) return -5;

        const todayProgress = sourceProgress[currentChallengeDayIndex];
        if (todayProgress?.completed) {
            const playedDate = getLocalDateKey(todayProgress.date);
            const todayDate = getLocalDateKey(now);
            if (playedDate === todayDate) return -2;
            return -1;
        }

        return currentChallengeDayIndex;
    }, [challengeStartDate, currentChallengeDayIndex, effectiveDailyProgress, referenceNow]);

    return {
        currentUsername,
        userDisplayName,
        isAdmin,
        currentChallengeDayIndex,
        effectiveDailyProgress,
        nextAvailableDay
    };
};
