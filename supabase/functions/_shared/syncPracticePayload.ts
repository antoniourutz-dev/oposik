export type SyncPracticePayloadErrorCode =
  | 'INVALID_PAYLOAD'
  | 'PAYLOAD_TOO_LARGE'
  | 'METHOD_NOT_ALLOWED'
  | 'UNAUTHORIZED';

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: SyncPracticePayloadErrorCode; message: string };

export type OptionKey = 'a' | 'b' | 'c' | 'd';

export type SyncPracticeSessionPayload = {
  curriculum: string;
  session: {
    id: string;
    mode: string;
    title: string;
    startedAt: string;
    batchNumber: number | null;
    batchSize: number | null;
    batchStartIndex: number | null;
    nextStandardBatchStartIndex: number | null;
  };
  attempts: Array<{
    question_id: string;
    question_number: number | null;
    statement: string | null;
    category: string | null;
    explanation: string | null;
    answered_at: string;
    response_time_ms: number | null;
    time_to_first_selection_ms: number | null;
    selected_option: OptionKey | null;
    correct_option: OptionKey;
    is_correct: boolean;
    changed_answer: boolean;
    error_type_inferred: unknown;
  }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const isOptionKey = (value: unknown): value is OptionKey =>
  value === 'a' || value === 'b' || value === 'c' || value === 'd';

const parseOptionKey = (value: unknown): OptionKey | null => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : String(value);
  return isOptionKey(normalized) ? normalized : null;
};

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (value === 0) return false;
  if (value === 1) return true;
  return null;
};

const parseCurriculum = (value: unknown): string => {
  const trimmed = toTrimmedString(value);
  return trimmed ?? 'general';
};

const parseSession = (value: unknown): SyncPracticeSessionPayload['session'] | null => {
  if (!isRecord(value)) return null;
  const id = toTrimmedString(value.id);
  if (!id) return null;

  const mode = toNullableString(value.mode) ?? '';
  const title = toNullableString(value.title) ?? '';
  const startedAt = toTrimmedString(value.startedAt) ?? '';
  if (!startedAt) return null;

  return {
    id,
    mode,
    title,
    startedAt,
    batchNumber: toNullableNumber(value.batchNumber),
    batchSize: toNullableNumber(value.batchSize),
    batchStartIndex: toNullableNumber(value.batchStartIndex),
    nextStandardBatchStartIndex: toNullableNumber(value.nextStandardBatchStartIndex),
  };
};

const parseAttempt = (value: unknown) => {
  if (!isRecord(value)) return null;

  const question_id = toTrimmedString(value.question_id);
  if (!question_id) return null;

  const answered_at = toTrimmedString(value.answered_at);
  if (!answered_at) return null;

  const is_correct = parseBoolean(value.is_correct);
  if (is_correct === null) return null;

  const correct_option = parseOptionKey(value.correct_option) ?? 'a';
  const selected_option = parseOptionKey(value.selected_option);

  return {
    question_id,
    question_number: toNullableNumber(value.question_number),
    statement: toNullableString(value.statement),
    category: value.category === null || value.category === undefined ? null : toNullableString(value.category),
    explanation:
      value.explanation === null || value.explanation === undefined ? null : toNullableString(value.explanation),
    answered_at,
    response_time_ms: toNullableNumber(value.response_time_ms),
    time_to_first_selection_ms: toNullableNumber(value.time_to_first_selection_ms),
    selected_option,
    correct_option,
    is_correct,
    changed_answer: Boolean(value.changed_answer),
    error_type_inferred: value.error_type_inferred,
  };
};

export const parseSyncPracticeSessionPayload = (
  value: unknown,
  { maxAttempts = 200 }: { maxAttempts?: number } = {},
): ParseResult<SyncPracticeSessionPayload> => {
  if (!isRecord(value)) {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'Invalid payload.' };
  }

  const curriculum = parseCurriculum(value.curriculum);
  const session = parseSession(value.session);
  if (!session) {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'Invalid session payload.' };
  }

  const attemptsRaw = value.attempts;
  if (!Array.isArray(attemptsRaw)) {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'Invalid attempts payload.' };
  }

  if (attemptsRaw.length > maxAttempts) {
    return { ok: false, status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Too many attempts.' };
  }

  const attempts = attemptsRaw.map(parseAttempt).filter(Boolean) as SyncPracticeSessionPayload['attempts'];
  if (attempts.length === 0 || attempts.length !== attemptsRaw.length) {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'Invalid attempts payload.' };
  }

  return { ok: true, value: { curriculum, session, attempts } };
};

