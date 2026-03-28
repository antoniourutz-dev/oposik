import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { supabase } from '../supabaseClient';
import {
  PracticeCatalogSummary,
  PracticeQuestion,
  WeakQuestionInsight
} from '../practiceTypes';
import { mapQuestion, mapWeakQuestionInsight, readNumber } from './preguntasMappers';

const QUESTIONS_PAGE_SIZE = 500;

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

const shuffleQuestions = (questions: PracticeQuestion[]) => {
  const nextQuestions = [...questions];

  for (let index = nextQuestions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = nextQuestions[index];
    nextQuestions[index] = nextQuestions[swapIndex];
    nextQuestions[swapIndex] = current;
  }

  return nextQuestions;
};

const isMissingGuestRpcError = (error: { code?: string; message?: string; details?: string | null }) => {
  const normalizedMessage = String(error.message ?? '').toLowerCase();
  const normalizedDetails = String(error.details ?? '').toLowerCase();

  return (
    error.code === 'PGRST202' ||
    normalizedMessage.includes('get_public_guest_practice_batch') ||
    normalizedMessage.includes('could not find the function') ||
    normalizedDetails.includes('get_public_guest_practice_batch')
  );
};

export const getPracticeCatalogSummary = async (
  curriculum = DEFAULT_CURRICULUM
): Promise<PracticeCatalogSummary> => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('get_practice_catalog_summary', {
      p_curriculum: curriculum
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    totalQuestions: readNumber((data as Record<string, unknown> | null)?.total_questions) ?? 0
  };
};

export const getStandardPracticeBatch = async (
  batchStartIndex: number,
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('get_standard_practice_batch', {
      p_curriculum: curriculum,
      p_batch_start_index: batchStartIndex,
      p_batch_size: batchSize
    });

  if (error) {
    throw error;
  }

  return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
};

export const getWeakPracticeInsights = async (
  curriculum = DEFAULT_CURRICULUM,
  limit = 5
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('get_weak_practice_batch', {
      p_curriculum: curriculum,
      p_limit: limit
    });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map(mapWeakQuestionInsight)
    .filter((item): item is WeakQuestionInsight => Boolean(item));
};

export const getRandomPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('get_random_practice_batch', {
      p_curriculum: curriculum,
      p_batch_size: batchSize
    });

  if (error) {
    throw error;
  }

  return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
};

export const getGuestPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM
) => {
  try {
    const questions = await getPracticeQuestions();
    return shuffleQuestions(questions).slice(0, Math.max(1, batchSize));
  } catch (directReadError) {
    const { data, error } = await supabase
      .schema('app')
      .rpc('get_public_guest_practice_batch', {
        p_curriculum: curriculum,
        p_batch_size: batchSize
      });

    if (error) {
      if (!isMissingGuestRpcError(error)) {
        throw error;
      }

      throw new Error(
        'No se ha podido cargar el bloque de invitado. Aplica la migracion `20260328120000_public_guest_practice_batch.sql` o permite lectura publica de `preguntas`.'
      );
    }

    return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
  }
};

export const getMixedPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('get_mixed_practice_batch', {
      p_curriculum: curriculum,
      p_batch_size: batchSize
    });

  if (error) {
    throw error;
  }

  return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
};

export const getAntiTrapPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('get_anti_trap_batch', {
      p_curriculum: curriculum,
      p_limit: batchSize
    });

  if (error) {
    throw error;
  }

  return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
};

export const getSimulacroPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('get_simulacro_batch', {
      p_curriculum: curriculum,
      p_limit: batchSize
    });

  if (error) {
    throw error;
  }

  return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
};

export const getPracticeQuestions = async () => {
  const runQuery = (orderField: string | null, from: number, to: number) => {
    let query = supabase.from('preguntas').select('*').range(from, to);

    if (orderField) {
      query = query.order(orderField, { ascending: true });
    }

    return query;
  };

  const fetchAllRows = async (orderField: string | null) => {
    const rows: Array<Record<string, unknown>> = [];
    let from = 0;

    while (true) {
      const to = from + QUESTIONS_PAGE_SIZE - 1;
      const response = await runQuery(orderField, from, to);

      if (response.error) {
        return response;
      }

      const page = (response.data ?? []) as Array<Record<string, unknown>>;
      rows.push(...page);

      if (page.length < QUESTIONS_PAGE_SIZE) {
        return {
          data: rows,
          error: null
        };
      }

      from += QUESTIONS_PAGE_SIZE;
    }
  };

  let response = await fetchAllRows('numero');

  if (response.error && /column .*numero/i.test(response.error.message)) {
    response = await fetchAllRows('id');
  }

  if (response.error && /column .*id/i.test(response.error.message)) {
    response = await fetchAllRows(null);
  }

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as Array<Record<string, unknown>>)
    .map(mapQuestion)
    .filter((question): question is PracticeQuestion => Boolean(question));
};
