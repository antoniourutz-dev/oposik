export type OptionKey = 'a' | 'b' | 'c' | 'd';
export type PracticeMode = 'standard' | 'weakest';

export interface PracticeQuestion {
  id: string;
  number: number | null;
  statement: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  category: string | null;
  explanation: string | null;
}

export interface PracticeAnswer {
  question: PracticeQuestion;
  selectedOption: OptionKey | null;
  isCorrect: boolean;
}

export interface PracticeQuestionStat {
  questionId: string;
  questionNumber: number | null;
  statement: string;
  category: string | null;
  explanation: string | null;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  lastAnsweredAt: string;
  lastIncorrectAt: string | null;
}

export interface PracticeSessionSummary {
  id: string;
  mode: PracticeMode;
  title: string;
  startedAt: string;
  finishedAt: string;
  score: number;
  total: number;
  questionIds: string[];
}

export interface PracticePlayer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSessions: number;
  nextStandardBatchStartIndex: number;
  questionStats: Record<string, PracticeQuestionStat>;
  recentSessions: PracticeSessionSummary[];
}

export interface PracticeStore {
  version: number;
  activePlayerId: string;
  players: Record<string, PracticePlayer>;
}

export interface PracticeProfile {
  userId: string;
  curriculum: string;
  nextStandardBatchStartIndex: number;
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSessions: number;
  lastStudiedAt: string | null;
}

export interface ActivePracticeSession {
  id: string;
  mode: PracticeMode;
  title: string;
  subtitle: string;
  questions: PracticeQuestion[];
  startedAt: string;
  batchNumberLabel: string;
  batchStartIndex: number | null;
  continueLabel: string;
  nextStandardBatchStartIndex: number | null;
}

export interface WeakQuestionInsight {
  question: PracticeQuestion;
  stat: PracticeQuestionStat;
}

export interface CloudPracticeState {
  profile: PracticeProfile | null;
  recentSessions: PracticeSessionSummary[];
  questionStats: PracticeQuestionStat[];
}
