import { SIMULACRO_TIME_LIMIT_SECONDS } from '../practiceConfig';
import type { PracticeMode, PracticeSessionSummary } from '../practiceTypes';

const DEFAULT_SESSION_STATS_CAP_SECONDS = 45 * 60;
const DEFAULT_SESSION_STATS_FALLBACK_SECONDS = 12 * 60;

const SESSION_STATS_CAP_SECONDS_BY_MODE: Record<PracticeMode, number> = {
  standard: DEFAULT_SESSION_STATS_CAP_SECONDS,
  quick_five: 15 * 60,
  weakest: 30 * 60,
  random: DEFAULT_SESSION_STATS_CAP_SECONDS,
  review: 30 * 60,
  mixed: DEFAULT_SESSION_STATS_CAP_SECONDS,
  simulacro: SIMULACRO_TIME_LIMIT_SECONDS,
  anti_trap: 30 * 60,
  catalog_review: DEFAULT_SESSION_STATS_CAP_SECONDS,
};

const SESSION_STATS_FALLBACK_SECONDS_BY_MODE: Record<PracticeMode, number> = {
  standard: 12 * 60,
  quick_five: 4 * 60,
  weakest: 8 * 60,
  random: 12 * 60,
  review: 8 * 60,
  mixed: 14 * 60,
  simulacro: 60 * 60,
  anti_trap: 10 * 60,
  catalog_review: 15 * 60,
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRawSessionDurationSeconds(
  session: Pick<PracticeSessionSummary, 'startedAt' | 'finishedAt'>,
): number | null {
  const startedAt = new Date(session.startedAt);
  const finishedAt = new Date(session.finishedAt);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(finishedAt.getTime())) {
    return null;
  }

  const rawSeconds = (finishedAt.getTime() - startedAt.getTime()) / 1000;
  if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) {
    return null;
  }

  return rawSeconds;
}

export function getSessionDurationSecondsForStats(
  session: Pick<PracticeSessionSummary, 'mode' | 'startedAt' | 'finishedAt'>,
): number | null {
  const rawSeconds = getRawSessionDurationSeconds(session);
  if (rawSeconds === null) return null;
  const maxSeconds =
    SESSION_STATS_CAP_SECONDS_BY_MODE[session.mode] ?? DEFAULT_SESSION_STATS_CAP_SECONDS;
  return rawSeconds > maxSeconds ? null : rawSeconds;
}

export function getSessionDurationsSecondsForStats(
  sessions: Array<Pick<PracticeSessionSummary, 'mode' | 'startedAt' | 'finishedAt'>>,
): number[] {
  const samples = sessions
    .map((session) => {
      const rawSeconds = getRawSessionDurationSeconds(session);
      const capSeconds =
        SESSION_STATS_CAP_SECONDS_BY_MODE[session.mode] ?? DEFAULT_SESSION_STATS_CAP_SECONDS;
      return {
        mode: session.mode,
        rawSeconds,
        exceededCap: rawSeconds !== null && rawSeconds > capSeconds,
      };
    })
    .filter(
      (
        sample,
      ): sample is {
        mode: PracticeMode;
        rawSeconds: number | null;
        exceededCap: boolean;
      } => true,
    );

  const validDurations = samples
    .filter((sample) => sample.rawSeconds !== null && !sample.exceededCap)
    .map((sample) => sample.rawSeconds as number);

  return samples.flatMap((sample) => {
    if (sample.rawSeconds === null) return [];
    if (!sample.exceededCap) return [sample.rawSeconds];

    const sameModeAverage = average(
      samples
        .filter(
          (candidate) =>
            candidate.mode === sample.mode &&
            candidate.rawSeconds !== null &&
            !candidate.exceededCap,
        )
        .map((candidate) => candidate.rawSeconds as number),
    );

    return [
      sameModeAverage ??
        average(validDurations) ??
        SESSION_STATS_FALLBACK_SECONDS_BY_MODE[sample.mode] ??
        DEFAULT_SESSION_STATS_FALLBACK_SECONDS,
    ];
  });
}
