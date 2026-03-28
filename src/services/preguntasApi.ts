import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { supabase } from '../supabaseClient';
import {
  PracticeCatalogSummary,
  PracticeQuestion,
  PracticeQuestionScopeFilter,
  WeakQuestionInsight
} from '../practiceTypes';
import { mapQuestion, readNumber } from './preguntasMappers';
import { mapQuestionStat } from './practiceCloudMappers';
import { filterQuestionsByScope } from '../utils/practiceQuestionScope';

const QUESTIONS_PAGE_SIZE = 500;
const WEAK_INSIGHTS_FALLBACK_LIMIT = 120;

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

const takeUniqueQuestions = (
  questions: PracticeQuestion[],
  limit: number,
  excludedIds = new Set<string>()
) => {
  const nextQuestions: PracticeQuestion[] = [];
  const seenIds = new Set(excludedIds);

  for (const question of questions) {
    if (seenIds.has(question.id)) continue;
    seenIds.add(question.id);
    nextQuestions.push(question);

    if (nextQuestions.length >= limit) {
      break;
    }
  }

  return nextQuestions;
};

const mapPayloadRowsWithScope = (
  rows: Array<Record<string, unknown>>,
  questionScope: PracticeQuestionScopeFilter
) => filterQuestionsByScope(mapQuestionPayloadRows(rows), questionScope);

const compareWeakInsights = (left: WeakQuestionInsight, right: WeakQuestionInsight) => {
  const incorrectDelta = right.stat.incorrectAttempts - left.stat.incorrectAttempts;
  if (incorrectDelta !== 0) {
    return incorrectDelta;
  }

  const leftRatio =
    left.stat.attempts > 0 ? left.stat.incorrectAttempts / left.stat.attempts : 0;
  const rightRatio =
    right.stat.attempts > 0 ? right.stat.incorrectAttempts / right.stat.attempts : 0;
  const ratioDelta = rightRatio - leftRatio;
  if (ratioDelta !== 0) {
    return ratioDelta;
  }

  const leftTimestamp = left.stat.lastIncorrectAt
    ? Date.parse(left.stat.lastIncorrectAt)
    : Number.NEGATIVE_INFINITY;
  const rightTimestamp = right.stat.lastIncorrectAt
    ? Date.parse(right.stat.lastIncorrectAt)
    : Number.NEGATIVE_INFINITY;

  return rightTimestamp - leftTimestamp;
};

const isMissingGuestRpcError = (error: {
  code?: string;
  message?: string;
  details?: string | null;
}) => {
  const normalizedMessage = String(error.message ?? '').toLowerCase();
  const normalizedDetails = String(error.details ?? '').toLowerCase();

  return (
    error.code === 'PGRST202' ||
    normalizedMessage.includes('get_public_guest_practice_batch') ||
    normalizedMessage.includes('could not find the function') ||
    normalizedDetails.includes('get_public_guest_practice_batch')
  );
};

const getWeakPracticeInsightsFromTables = async (
  curriculum = DEFAULT_CURRICULUM,
  limit = 5,
  questionScope: PracticeQuestionScopeFilter = 'all'
) => {
  const fetchLimit = Math.min(
    WEAK_INSIGHTS_FALLBACK_LIMIT,
    Math.max(limit * (questionScope === 'all' ? 4 : 10), 24)
  );

  const [questions, statsResponse] = await Promise.all([
    getPracticeQuestions(curriculum, questionScope),
    supabase
      .schema('app')
      .from('practice_question_stats')
      .select(
        'question_id, question_number, statement, category, explanation, attempts, correct_attempts, incorrect_attempts, last_answered_at, last_incorrect_at'
      )
      .eq('curriculum', curriculum)
      .gt('incorrect_attempts', 0)
      .order('incorrect_attempts', { ascending: false })
      .limit(fetchLimit)
  ]);

  if (statsResponse.error) {
    throw statsResponse.error;
  }

  const questionsById = new Map(questions.map((question) => [question.id, question] as const));

  return ((statsResponse.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const stat = mapQuestionStat(row);
      const question = questionsById.get(stat.questionId);
      if (!question) return null;

      return {
        question,
        stat: {
          ...stat,
          questionNumber: stat.questionNumber ?? question.number,
          statement: stat.statement || question.statement,
          category: stat.category ?? question.category,
          questionScope: stat.questionScope ?? question.questionScope ?? null,
          explanation: stat.explanation ?? question.explanation,
          editorialExplanation:
            stat.editorialExplanation ?? question.editorialExplanation ?? null
        }
      } satisfies WeakQuestionInsight;
    })
    .filter((item): item is WeakQuestionInsight => Boolean(item))
    .sort(compareWeakInsights)
    .slice(0, limit);
};

export const getPracticeCatalogSummary = async (
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all'
): Promise<PracticeCatalogSummary> => {
  if (questionScope !== 'all') {
    const questions = await getPracticeQuestions(curriculum, questionScope);
    return {
      totalQuestions: questions.length
    };
  }

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
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all'
) => {
  if (questionScope !== 'all') {
    const questions = await getPracticeQuestions(curriculum, questionScope);
    return questions.slice(batchStartIndex, batchStartIndex + batchSize);
  }

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
  limit = 5,
  questionScope: PracticeQuestionScopeFilter = 'all'
) => getWeakPracticeInsightsFromTables(curriculum, limit, questionScope);

export const getRandomPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all'
) => {
  if (questionScope !== 'all') {
    const questions = await getPracticeQuestions(curriculum, questionScope);
    return shuffleQuestions(questions).slice(0, Math.max(1, batchSize));
  }

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
    const questions = await getPracticeQuestions(curriculum, 'common');
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

    return mapPayloadRowsWithScope((data ?? []) as Array<Record<string, unknown>>, 'common');
  }
};

export const getMixedPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all'
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

  if (questionScope === 'all') {
    return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
  }

  const filteredQuestions = mapPayloadRowsWithScope(
    (data ?? []) as Array<Record<string, unknown>>,
    questionScope
  );
  if (filteredQuestions.length >= batchSize) {
    return filteredQuestions.slice(0, batchSize);
  }

  const questions = await getPracticeQuestions(curriculum, questionScope);
  return takeUniqueQuestions(
    [...filteredQuestions, ...shuffleQuestions(questions)],
    Math.max(1, batchSize)
  );
};

export const getAntiTrapPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all'
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

  if (questionScope === 'all') {
    return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
  }

  const filteredQuestions = mapPayloadRowsWithScope(
    (data ?? []) as Array<Record<string, unknown>>,
    questionScope
  );
  if (filteredQuestions.length >= batchSize) {
    return filteredQuestions.slice(0, batchSize);
  }

  const questions = await getPracticeQuestions(curriculum, questionScope);
  return takeUniqueQuestions(
    [...filteredQuestions, ...shuffleQuestions(questions)],
    Math.max(1, batchSize)
  );
};

export const getSimulacroPracticeBatch = async (
  batchSize: number,
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all'
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

  if (questionScope === 'all') {
    return mapQuestionPayloadRows((data ?? []) as Array<Record<string, unknown>>);
  }

  const filteredQuestions = mapPayloadRowsWithScope(
    (data ?? []) as Array<Record<string, unknown>>,
    questionScope
  );
  if (filteredQuestions.length >= batchSize) {
    return filteredQuestions.slice(0, batchSize);
  }

  const questions = await getPracticeQuestions(curriculum, questionScope);
  return takeUniqueQuestions(
    [...filteredQuestions, ...shuffleQuestions(questions)],
    Math.max(20, batchSize)
  );
};

export const getPracticeQuestions = async (
  _curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all'
) => {
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

  const questions = ((response.data ?? []) as Array<Record<string, unknown>>)
    .map(mapQuestion)
    .filter((question): question is PracticeQuestion => Boolean(question));

  return filterQuestionsByScope(questions, questionScope);
};
