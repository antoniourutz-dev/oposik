import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { supabase } from '../supabaseClient';
import { trackAsyncOperation } from '../telemetry/telemetryClient';
import {
  PracticeCategoryRiskSummary,
  PracticeCatalogSummary,
  PracticeQuestion,
  PracticeQuestionScopeFilter,
  WeakQuestionInsight,
} from '../practiceTypes';
import { mapCategoryRiskSummary } from './practiceCloudMappers';
import { mapQuestion, mapWeakQuestionInsight, readNumber } from './preguntasMappers';

const mapQuestionPayloadRows = (rows: Array<Record<string, unknown>>) =>
  rows
    .map((row) => {
      const payload =
        row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : null;
      return payload ? mapQuestion(payload) : null;
    })
    .filter((question): question is PracticeQuestion => Boolean(question));

const mapWeakInsightRows = (rows: Array<Record<string, unknown>>) =>
  rows
    .map((row) => mapWeakQuestionInsight(row))
    .filter((insight): insight is WeakQuestionInsight => Boolean(insight));

const toConfidenceFlag = (attempts: number): PracticeCategoryRiskSummary['confidenceFlag'] => {
  if (attempts >= 20) return 'high';
  if (attempts >= 8) return 'medium';
  return 'low';
};

const mapLegacyWeakCategoryRows = (
  rows: Array<Record<string, unknown>>,
): PracticeCategoryRiskSummary[] =>
  rows.map((row) => {
    const attempts = readNumber(row.attempts) ?? 0;
    const incorrectAttempts = readNumber(row.incorrect_attempts) ?? 0;
    const rawFailRate = attempts > 0 ? incorrectAttempts / attempts : null;

    return {
      category: String(row.category ?? 'Sin grupo').trim() || 'Sin grupo',
      incorrectAttempts,
      attempts,
      rawFailRate,
      smoothedFailRate: rawFailRate,
      baselineFailRate: null,
      excessRisk: null,
      sampleOk: attempts >= 8,
      confidenceFlag: toConfidenceFlag(attempts),
    };
  });

const isMissingCategoryRiskDashboard = (error: { code?: string; message?: string }) => {
  const normalizedMessage = String(error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    normalizedMessage.includes('get_category_risk_dashboard') ||
    normalizedMessage.includes('schema cache')
  );
};

export const getPracticeCatalogSummary = async (
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
): Promise<PracticeCatalogSummary> => {
  return trackAsyncOperation(
    'preguntas.getPracticeCatalogSummary',
    async () => {
      const { data, error } = await supabase
        .schema('app')
        .rpc('get_practice_catalog_summary', {
          p_curriculum: curriculum,
          p_question_scope: questionScope,
        })
        .maybeSingle();

      if (error) {
        throw error;
      }

      return {
        totalQuestions: readNumber((data as Record<string, unknown> | null)?.total_questions) ?? 0,
      };
    },
    { curriculum, questionScope },
  );
};

export const getStandardPracticeBatch = async (
  batchStartIndex: number,
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'preguntas.getStandardPracticeBatch',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_standard_practice_batch', {
        p_curriculum: curriculum,
        p_batch_start_index: batchStartIndex,
        p_batch_size: batchSize,
        p_question_scope: questionScope,
      });

      if (error) {
        throw error;
      }

      return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, questionScope, batchSize, batchStartIndex },
  );
};

export const getWeakPracticeInsights = async (
  curriculum = DEFAULT_CURRICULUM,
  limit = 5,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'preguntas.getWeakPracticeInsights',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_weak_practice_batch', {
        p_curriculum: curriculum,
        p_limit: limit,
        p_question_scope: questionScope,
      });

      if (error) {
        throw error;
      }

      return mapWeakInsightRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, questionScope, limit },
  );
};

export const getRandomPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'preguntas.getRandomPracticeBatch',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_random_practice_batch', {
        p_curriculum: curriculum,
        p_batch_size: batchSize,
        p_question_scope: questionScope,
      });

      if (error) {
        throw error;
      }

      return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, questionScope, batchSize },
  );
};

export const getWeakCategorySummary = async (
  curriculum = DEFAULT_CURRICULUM,
  limit = 5,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'preguntas.getCategoryRiskDashboard',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_category_risk_dashboard', {
        p_curriculum: curriculum,
        p_limit: limit,
        p_question_scope: questionScope,
      });

      if (!error) {
        return ((data ?? []) as Array<Record<string, unknown>>).map(mapCategoryRiskSummary);
      }

      if (!isMissingCategoryRiskDashboard(error)) {
        throw error;
      }

      const { data: fallbackData, error: fallbackError } = await supabase
        .schema('app')
        .rpc('get_weak_category_summary', {
          p_curriculum: curriculum,
          p_limit: limit,
          p_question_scope: questionScope,
        });

      if (fallbackError) {
        throw fallbackError;
      }

      return mapLegacyWeakCategoryRows((fallbackData ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, questionScope, limit },
  );
};

export const getGuestPracticeBatch = async (batchSize: number, curriculum = DEFAULT_CURRICULUM) => {
  return trackAsyncOperation(
    'preguntas.getGuestPracticeBatch',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_public_guest_practice_batch', {
        p_curriculum: curriculum,
        p_batch_size: batchSize,
        p_question_scope: 'common',
      });

      if (error) {
        throw error;
      }

      return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, batchSize, questionScope: 'common' },
  );
};

export const getMixedPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'preguntas.getMixedPracticeBatch',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_mixed_practice_batch', {
        p_curriculum: curriculum,
        p_batch_size: batchSize,
        p_question_scope: questionScope,
      });

      if (error) {
        throw error;
      }

      return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, questionScope, batchSize },
  );
};

export const getAntiTrapPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'preguntas.getAntiTrapPracticeBatch',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_anti_trap_batch', {
        p_curriculum: curriculum,
        p_limit: batchSize,
        p_question_scope: questionScope,
      });

      if (error) {
        throw error;
      }

      return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, questionScope, batchSize },
  );
};

export const getSimulacroPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'preguntas.getSimulacroPracticeBatch',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_simulacro_batch', {
        p_curriculum: curriculum,
        p_limit: batchSize,
        p_question_scope: questionScope,
      });

      if (error) {
        throw error;
      }

      return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, questionScope, batchSize },
  );
};

export const getLawPracticeBatch = async (
  law: string,
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
) => {
  return trackAsyncOperation(
    'preguntas.getLawPracticeBatch',
    async () => {
      const { data, error } = await supabase.schema('app').rpc('get_law_practice_batch', {
        p_law: law,
        p_curriculum: curriculum,
        p_batch_size: batchSize,
      });

      if (error) {
        throw error;
      }

      return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
    },
    { curriculum, law, batchSize },
  );
};
