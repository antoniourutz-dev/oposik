import {
  PracticeAnswer,
  PracticePlayer,
  PracticeQuestionStat,
  PracticeSessionSummary,
  PracticeStore
} from '../practiceTypes';

const STORAGE_KEY = 'oposikapp.practice.store.v1';
const STORE_VERSION = 1;
const MAX_RECENT_SESSIONS = 12;

const isClient = () => typeof window !== 'undefined';

const buildPlayer = (name: string): PracticePlayer => {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `player-${Date.now()}`;

  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalSessions: 0,
    nextStandardBatchStartIndex: 0,
    questionStats: {},
    recentSessions: []
  };
};

const sanitizeName = (rawName: string) => rawName.trim().replace(/\s+/g, ' ').slice(0, 40);

const createDefaultStore = () => {
  const player = buildPlayer('Jugador 1');

  return {
    version: STORE_VERSION,
    activePlayerId: player.id,
    players: {
      [player.id]: player
    }
  } satisfies PracticeStore;
};

const isValidQuestionStat = (value: unknown): value is PracticeQuestionStat => {
  if (!value || typeof value !== 'object') return false;
  const stat = value as Partial<PracticeQuestionStat>;

  return (
    typeof stat.questionId === 'string' &&
    typeof stat.statement === 'string' &&
    typeof stat.attempts === 'number' &&
    typeof stat.correctAttempts === 'number' &&
    typeof stat.incorrectAttempts === 'number' &&
    typeof stat.lastAnsweredAt === 'string'
  );
};

const normalizePlayer = (value: unknown): PracticePlayer | null => {
  if (!value || typeof value !== 'object') return null;
  const player = value as Partial<PracticePlayer>;
  if (typeof player.id !== 'string' || typeof player.name !== 'string') {
    return null;
  }

  const questionStatsEntries = Object.entries(player.questionStats ?? {}).filter((entry) =>
    isValidQuestionStat(entry[1])
  );

  return {
    id: player.id,
    name: player.name,
    createdAt: typeof player.createdAt === 'string' ? player.createdAt : new Date().toISOString(),
    updatedAt: typeof player.updatedAt === 'string' ? player.updatedAt : new Date().toISOString(),
    totalAnswered: typeof player.totalAnswered === 'number' ? player.totalAnswered : 0,
    totalCorrect: typeof player.totalCorrect === 'number' ? player.totalCorrect : 0,
    totalIncorrect: typeof player.totalIncorrect === 'number' ? player.totalIncorrect : 0,
    totalSessions: typeof player.totalSessions === 'number' ? player.totalSessions : 0,
    nextStandardBatchStartIndex:
      typeof player.nextStandardBatchStartIndex === 'number' ? player.nextStandardBatchStartIndex : 0,
    questionStats: Object.fromEntries(questionStatsEntries),
    recentSessions: Array.isArray(player.recentSessions)
      ? (player.recentSessions as PracticeSessionSummary[]).slice(0, MAX_RECENT_SESSIONS)
      : []
  };
};

export const loadPracticeStore = () => {
  if (!isClient()) return createDefaultStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultStore();

    const parsed = JSON.parse(raw) as Partial<PracticeStore>;
    const players = Object.values(parsed.players ?? {})
      .map(normalizePlayer)
      .filter((player): player is PracticePlayer => Boolean(player));

    if (players.length === 0) {
      return createDefaultStore();
    }

    const playersById = Object.fromEntries(players.map((player) => [player.id, player]));
    const activePlayerId =
      parsed.activePlayerId && playersById[parsed.activePlayerId]
        ? parsed.activePlayerId
        : players[0].id;

    return {
      version: STORE_VERSION,
      activePlayerId,
      players: playersById
    } satisfies PracticeStore;
  } catch {
    return createDefaultStore();
  }
};

export const savePracticeStore = (store: PracticeStore) => {
  if (!isClient()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const createPlayerInStore = (store: PracticeStore, rawName: string) => {
  const name = sanitizeName(rawName);
  if (!name) {
    return store;
  }

  const player = buildPlayer(name);
  return {
    ...store,
    activePlayerId: player.id,
    players: {
      ...store.players,
      [player.id]: player
    }
  } satisfies PracticeStore;
};

export const renamePlayerInStore = (store: PracticeStore, playerId: string, rawName: string) => {
  const name = sanitizeName(rawName);
  const player = store.players[playerId];
  if (!player || !name) {
    return store;
  }

  return {
    ...store,
    players: {
      ...store.players,
      [playerId]: {
        ...player,
        name,
        updatedAt: new Date().toISOString()
      }
    }
  } satisfies PracticeStore;
};

export const setActivePlayerInStore = (store: PracticeStore, playerId: string) => {
  if (!store.players[playerId]) return store;

  return {
    ...store,
    activePlayerId: playerId
  } satisfies PracticeStore;
};

type RecordSessionInput = {
  playerId: string;
  answers: PracticeAnswer[];
  session: PracticeSessionSummary;
  nextStandardBatchStartIndex: number;
};

export const recordPracticeSessionInStore = (
  store: PracticeStore,
  { playerId, answers, session, nextStandardBatchStartIndex }: RecordSessionInput
) => {
  const player = store.players[playerId];
  if (!player) return store;

  const updatedQuestionStats = { ...player.questionStats };

  answers.forEach((answer) => {
    const previous = updatedQuestionStats[answer.question.id];
    const nextStat: PracticeQuestionStat = {
      questionId: answer.question.id,
      questionNumber: answer.question.number,
      statement: answer.question.statement,
      category: answer.question.category,
      explanation: answer.question.explanation,
      attempts: (previous?.attempts ?? 0) + 1,
      correctAttempts: (previous?.correctAttempts ?? 0) + (answer.isCorrect ? 1 : 0),
      incorrectAttempts: (previous?.incorrectAttempts ?? 0) + (answer.isCorrect ? 0 : 1),
      lastAnsweredAt: session.finishedAt,
      lastIncorrectAt: answer.isCorrect ? previous?.lastIncorrectAt ?? null : session.finishedAt
    };

    updatedQuestionStats[answer.question.id] = nextStat;
  });

  const updatedPlayer: PracticePlayer = {
    ...player,
    updatedAt: session.finishedAt,
    totalAnswered: player.totalAnswered + answers.length,
    totalCorrect: player.totalCorrect + session.score,
    totalIncorrect: player.totalIncorrect + (session.total - session.score),
    totalSessions: player.totalSessions + 1,
    nextStandardBatchStartIndex,
    questionStats: updatedQuestionStats,
    recentSessions: [session, ...player.recentSessions].slice(0, MAX_RECENT_SESSIONS)
  };

  return {
    ...store,
    players: {
      ...store.players,
      [playerId]: updatedPlayer
    }
  } satisfies PracticeStore;
};
