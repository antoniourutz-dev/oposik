export const reqCache = {
    leaderboardsRequest: null as Promise<void> | null,
    quizDataRequest: null as Promise<void> | null,
    edukiaRequest: null as Promise<void> | null,
    registeredPlayersRequest: null as Promise<void> | null,
    globalStartDateRequest: null as Promise<void> | null,
    userDailyPlaysRequest: new Map<string, Promise<void>>(),
    leaderboardsFetchedAt: 0,
    userDailyPlaysFetchedAt: new Map<string, number>()
};
