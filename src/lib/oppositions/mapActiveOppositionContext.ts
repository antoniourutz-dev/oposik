import type { ActiveOppositionContext, OppositionOption } from '../../domain/oppositions/types';

const toText = (value: unknown, fallback = '') => String(value ?? '').trim() || fallback;
const toBool = (value: unknown) => Boolean(value);
const toMaybeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toMaybeString = (value: unknown): string | null => {
  const text = toText(value);
  return text ? text : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const readNestedRecord = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const nested = asRecord(record[key]);
    if (nested) return nested;
  }
  return null;
};

const readCandidate = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
};

export const mapActiveOppositionContext = (value: unknown): ActiveOppositionContext | null => {
  const record = asRecord(value);
  if (!record) return null;

  const profile = readNestedRecord(record, ['profile', 'user_opposition_profile', 'userProfile']);
  const opposition = readNestedRecord(record, ['opposition', 'active_opposition', 'oppositionData']);
  const source = opposition ?? record;
  const profileSource = profile ?? record;

  const oppositionId = toText(
    readCandidate(source, ['id', 'opposition_id', 'oppositionId']) ??
      readCandidate(profileSource, ['opposition_id', 'oppositionId']),
  );
  const oppositionName = toText(
    readCandidate(source, ['name', 'display_name', 'title', 'label', 'opposition_name']) ??
      readCandidate(profileSource, ['opposition_name', 'display_name', 'name', 'title', 'label']),
  );
  const curriculumKey = toText(
    readCandidate(source, ['curriculum_key', 'curriculum', 'curriculumKey']) ??
      readCandidate(profileSource, ['curriculum_key', 'curriculum', 'curriculumKey']),
  );

  if (!oppositionId || !oppositionName) return null;

  return {
    oppositionId,
    oppositionName,
    oppositionCode: toMaybeString(
      readCandidate(source, ['code', 'slug', 'short_code', 'opposition_code']),
    ),
    curriculumKey: curriculumKey || 'osakidetza_admin',
    userOppositionProfileId: toMaybeString(
      readCandidate(profileSource, ['id', 'profile_id', 'user_opposition_profile_id']),
    ),
    isActiveContext: toBool(readCandidate(profileSource, ['is_active_context', 'active_context'])),
    isPrimary: toBool(readCandidate(profileSource, ['is_primary', 'primary'])),
    onboardingCompleted: toBool(
      readCandidate(profileSource, ['onboarding_completed', 'has_onboarded']),
    ),
    examDate: toMaybeString(readCandidate(profileSource, ['exam_date', 'examDate'])),
    targetScore: toMaybeNumber(readCandidate(profileSource, ['target_score', 'targetScore'])),
    startedAt: toMaybeString(readCandidate(profileSource, ['started_at', 'startedAt'])),
    updatedAt: toMaybeString(readCandidate(profileSource, ['updated_at', 'updatedAt'])),
  };
};

export const mapOppositionOption = (value: unknown): OppositionOption | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = toText(readCandidate(record, ['id', 'opposition_id', 'oppositionId']));
  const name = toText(
    readCandidate(record, ['name', 'display_name', 'title', 'label', 'opposition_name']),
  );
  if (!id || !name) return null;

  const curriculumKey = toText(
    readCandidate(record, ['curriculum_key', 'curriculum', 'curriculumKey']),
  );

  const isActiveRaw = readCandidate(record, ['is_active', 'active', 'enabled', 'published']);
  return {
    id,
    name,
    code: toMaybeString(readCandidate(record, ['code', 'slug', 'short_code', 'opposition_code'])),
    curriculumKey,
    isActive: isActiveRaw === undefined ? true : Boolean(isActiveRaw),
  };
};
