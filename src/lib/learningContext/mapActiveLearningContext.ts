import { buildLearningContextConfig } from '../../domain/learningContext/catalog';
import type {
  ActiveLearningContext,
  LearningContextOption,
} from '../../domain/learningContext/types';

const toText = (value: unknown, fallback = '') => String(value ?? '').trim() || fallback;

const toMaybeString = (value: unknown): string | null => {
  const text = toText(value);
  return text ? text : null;
};

const toBool = (value: unknown) => Boolean(value);

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

export const mapActiveLearningContext = (value: unknown): ActiveLearningContext | null => {
  const record = asRecord(value);
  if (!record) return null;

  const profile = readNestedRecord(record, ['profile', 'user_opposition_profile', 'userProfile']);
  const opposition = readNestedRecord(record, ['opposition', 'active_opposition', 'oppositionData']);
  const source = opposition ?? record;
  const profileSource = profile ?? record;
  const configJson = asRecord(readCandidate(source, ['config_json', 'configJson'])) ?? {};

  const contextId = toText(
    readCandidate(source, ['id', 'opposition_id', 'oppositionId']) ??
      readCandidate(profileSource, ['opposition_id', 'oppositionId']),
  );
  const displayName = toText(
    readCandidate(source, ['name', 'display_name', 'title', 'label', 'opposition_name']),
  );
  const curriculumKey = toText(
    readCandidate(source, ['curriculum_key', 'curriculum', 'curriculumKey']) ??
      readCandidate(profileSource, ['curriculum_key', 'curriculum', 'curriculumKey']),
  );

  if (!contextId || !displayName || !curriculumKey) return null;

  return {
    contextId,
    contextType: 'opposition',
    displayName,
    shortName:
      toMaybeString(readCandidate(source, ['short_name', 'shortName', 'code', 'slug'])) ?? displayName,
    code: toMaybeString(readCandidate(source, ['code', 'slug', 'short_code', 'opposition_code'])),
    curriculumKey,
    themeKey: toMaybeString(readCandidate(source, ['theme_key', 'themeKey'])),
    configJson,
    examDate: toMaybeString(readCandidate(profileSource, ['exam_date', 'examDate'])),
    onboardingCompleted: toBool(
      readCandidate(profileSource, ['onboarding_completed', 'has_onboarded']),
    ),
    source: 'remote',
    config: buildLearningContextConfig('opposition', configJson),
  };
};

export const mapLearningContextOption = (value: unknown): LearningContextOption | null => {
  const record = asRecord(value);
  if (!record) return null;

  const contextId = toText(readCandidate(record, ['id', 'opposition_id', 'oppositionId']));
  const displayName = toText(
    readCandidate(record, ['name', 'display_name', 'title', 'label', 'opposition_name']),
  );
  if (!contextId || !displayName) return null;

  const configJson = asRecord(readCandidate(record, ['config_json', 'configJson'])) ?? {};
  const curriculumKey = toMaybeString(
    readCandidate(record, ['curriculum_key', 'curriculum', 'curriculumKey']),
  );
  const isActiveRaw = readCandidate(record, ['is_active', 'active', 'enabled', 'published']);

  return {
    contextId,
    contextType: 'opposition',
    displayName,
    shortName:
      toMaybeString(readCandidate(record, ['short_name', 'shortName', 'code', 'slug'])) ?? displayName,
    code: toMaybeString(readCandidate(record, ['code', 'slug', 'short_code', 'opposition_code'])),
    curriculumKey,
    description:
      'Preparacion competitiva con su propio curriculum, progreso y reglas de entrenamiento.',
    themeKey: toMaybeString(readCandidate(record, ['theme_key', 'themeKey'])),
    configJson,
    source: 'remote',
    isActive: isActiveRaw === undefined ? true : Boolean(isActiveRaw),
    config: buildLearningContextConfig('opposition', configJson),
  };
};
