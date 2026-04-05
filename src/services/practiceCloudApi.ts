import {
  PracticeAnswer,
  CloudPracticeState,
  ActivePracticeSession,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
} from '../practiceTypes';
import { DEFAULT_CURRICULUM, PRACTICE_BATCH_SIZE } from '../practiceConfig';
import { supabase } from '../supabaseClient';
import { trackAsyncOperation } from '../telemetry/telemetryClient';
import {
  mapExamTarget,
  mapPracticeCloudError,
  mapLearningDashboard,
  mapLearningDashboardV2,
  mapPressureInsights,
  mapPressureInsightsV2,
  mapProfile,
  mapSession,
  mergeProfileNextBatchFromLatestStandardSession,
} from './practiceCloudMappers';

/**
 * Las Edge Functions con JWT verification rechazan `Authorization: Bearer <anon_key>` (401).
 * `fetchWithAuth` usa el anon key si no hay sesión; hay que enviar siempre un access_token de usuario.
 */
const getAccessTokenForFunctionsInvoke = async (): Promise<string> => {
  let {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error(
      'No hay sesion activa. Inicia sesion de nuevo para guardar el progreso en la nube.',
    );
  }

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs < Date.now() + 90_000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
    if (expiresAtMs < Date.now()) {
      throw new Error(
        'Sesion caducada. Vuelve a iniciar sesion para guardar el progreso en la nube.',
      );
    }
  }

  return session.access_token;
};

/**
 * Solo los campos que consume `sync-practice-session`. Evita mandar `questions` enteras y fuerza
 * `nextStandardBatchStartIndex` en modo standard (JSON.stringify omite `undefined`).
 */
const buildSyncSessionBody = (session: ActivePracticeSession) => ({
  id: session.id,
  mode: session.mode,
  title: session.title,
  startedAt: session.startedAt,
  batchNumber: session.batchNumber,
  batchSize: session.mode === 'standard' ? session.questions.length || PRACTICE_BATCH_SIZE : null,
  batchStartIndex: session.batchStartIndex,
  nextStandardBatchStartIndex:
    session.mode === 'standard'
      ? Math.max(0, session.nextStandardBatchStartIndex ?? 0)
      : session.nextStandardBatchStartIndex,
});

const buildAttemptPayloads = (answers: PracticeAnswer[]) => {
  const attemptsByQuestionId = new Map<
    string,
    {
      question_id: string;
      question_number: number | null;
      statement: string;
      category: string | null;
      question_scope: string | null | undefined;
      explanation: string | null;
      selected_option: PracticeAnswer['selectedOption'];
      correct_option: PracticeAnswer['question']['correctOption'];
      is_correct: boolean;
      answered_at: string;
      response_time_ms: number | null;
      time_to_first_selection_ms: number | null;
      changed_answer: boolean;
      error_type_inferred: PracticeAnswer['errorTypeInferred'];
    }
  >();

  for (const answer of answers) {
    const questionId = String(answer.question.id ?? '').trim();
    if (!questionId) continue;

    attemptsByQuestionId.set(questionId, {
      question_id: questionId,
      question_number: answer.question.number,
      statement: answer.question.statement,
      category: answer.question.category,
      question_scope: answer.question.questionScope,
      explanation: answer.question.explanation,
      selected_option: answer.selectedOption,
      correct_option: answer.question.correctOption,
      is_correct: answer.isCorrect,
      answered_at: answer.answeredAt,
      response_time_ms: answer.responseTimeMs,
      time_to_first_selection_ms: answer.timeToFirstSelectionMs,
      changed_answer: answer.changedAnswer,
      error_type_inferred: answer.errorTypeInferred,
    });
  }

  return [...attemptsByQuestionId.values()];
};

export const getMyPracticeState = async (
  curriculum = DEFAULT_CURRICULUM,
): Promise<CloudPracticeState> => {
  return trackAsyncOperation(
    'practiceCloud.getMyPracticeState',
    async () => {
      const [
        { data: profileData, error: profileError },
        { data: sessionsData, error: sessionsError },
        { data: learningDashboardData, error: learningDashboardError },
        { data: examTargetData, error: examTargetError },
        { data: pressureInsightsData, error: pressureInsightsError },
      ] = await Promise.all([
        supabase
          .schema('app')
          .rpc('get_my_practice_profile_for_curriculum', {
            p_curriculum: curriculum,
          })
          .maybeSingle(),
        supabase
          .schema('app')
          .from('practice_sessions')
          .select('session_id, mode, title, started_at, finished_at, score, total, next_standard_batch_start_index')
          .eq('curriculum', curriculum)
          .order('finished_at', { ascending: false })
          // Calendario y racha usan esta lista: 12 sesiones ocultaban días anteriores con varias sesiones/día.
          .limit(250),
        supabase
          .schema('app')
          .rpc('get_readiness_dashboard', {
            p_curriculum: curriculum,
          })
          .maybeSingle(),
        supabase
          .schema('app')
          .rpc('get_my_exam_target', {
            p_curriculum: curriculum,
          })
          .maybeSingle(),
        supabase
          .schema('app')
          .rpc('get_pressure_dashboard', {
            p_curriculum: curriculum,
          })
          .maybeSingle(),
      ]);

      const firstError = profileError || sessionsError;
      if (firstError) {
        throw new Error(mapPracticeCloudError(firstError));
      }

      const sessionRows = (sessionsData ?? []) as Array<Record<string, unknown>>;
      const profileFromRpc = mapProfile((profileData ?? null) as Record<string, unknown> | null);

      return {
        profile: mergeProfileNextBatchFromLatestStandardSession(profileFromRpc, sessionRows),
        recentSessions: sessionRows.map(mapSession),
        learningDashboard: learningDashboardError
          ? null
          : mapLearningDashboard((learningDashboardData ?? null) as Record<string, unknown> | null),
        examTarget: examTargetError
          ? null
          : mapExamTarget((examTargetData ?? null) as Record<string, unknown> | null),
        pressureInsights: pressureInsightsError
          ? null
          : mapPressureInsights((pressureInsightsData ?? null) as Record<string, unknown> | null),
      };
    },
    { curriculum },
  );
};

export const getMyLearningDashboardV2 = async (
  curriculum = DEFAULT_CURRICULUM,
): Promise<PracticeLearningDashboardV2 | null> => {
  return trackAsyncOperation(
    'practiceCloud.getReadinessDashboardV2',
    async () => {
      const { data, error } = await supabase
        .schema('app')
        .rpc('get_readiness_dashboard_v2', {
          p_curriculum: curriculum,
        })
        .maybeSingle();

      if (error) {
        throw new Error(mapPracticeCloudError(error));
      }

      return mapLearningDashboardV2((data ?? null) as Record<string, unknown> | null);
    },
    { curriculum },
  );
};

export const recordQuestionExplanationOpened = async ({
  questionId,
  curriculum = DEFAULT_CURRICULUM,
  sessionId = null,
  surface = 'review',
  explanationKind = 'base',
}: {
  questionId: string;
  curriculum?: string;
  sessionId?: string | null;
  surface?: 'quiz' | 'review' | 'study' | 'admin';
  explanationKind?: 'base' | 'editorial' | 'both';
}) => {
  const normalizedQuestionId = String(questionId ?? '').trim();
  if (!normalizedQuestionId) return;

  const { error } = await supabase.schema('app').rpc('record_question_explanation_opened', {
    p_question_id: normalizedQuestionId,
    p_curriculum: curriculum,
    p_session_id: sessionId,
    p_surface: surface,
    p_explanation_kind: explanationKind,
  });

  if (error) {
    throw new Error(mapPracticeCloudError(error));
  }
};

export const getMyPressureDashboardV2 = async (
  curriculum = DEFAULT_CURRICULUM,
): Promise<PracticePressureInsightsV2 | null> => {
  return trackAsyncOperation(
    'practiceCloud.getPressureDashboardV2',
    async () => {
      const { data, error } = await supabase
        .schema('app')
        .rpc('get_pressure_dashboard_v2', {
          p_curriculum: curriculum,
        })
        .maybeSingle();

      if (error) {
        throw new Error(mapPracticeCloudError(error));
      }

      return mapPressureInsightsV2((data ?? null) as Record<string, unknown> | null);
    },
    { curriculum },
  );
};

export const upsertMyExamTarget = async ({
  curriculum = DEFAULT_CURRICULUM,
  examDate,
  dailyReviewCapacity,
  dailyNewCapacity,
}: {
  curriculum?: string;
  examDate: string | null;
  dailyReviewCapacity: number;
  dailyNewCapacity: number;
}) => {
  return trackAsyncOperation(
    'practiceCloud.upsertMyExamTarget',
    async () => {
      const { data, error } = await supabase
        .schema('app')
        .rpc('upsert_my_exam_target', {
          p_curriculum: curriculum,
          p_exam_date: examDate,
          p_daily_review_capacity: dailyReviewCapacity,
          p_daily_new_capacity: dailyNewCapacity,
        })
        .maybeSingle();

      if (error) {
        throw new Error(mapPracticeCloudError(error));
      }

      return mapExamTarget((data ?? null) as Record<string, unknown> | null);
    },
    {
      curriculum,
      hasExamDate: Boolean(examDate),
      dailyReviewCapacity,
      dailyNewCapacity,
    },
  );
};

export const recordPracticeSessionInCloud = async (
  session: ActivePracticeSession,
  answers: PracticeAnswer[],
  curriculum = DEFAULT_CURRICULUM,
) => {
  const attemptPayloads = buildAttemptPayloads(answers);

  await trackAsyncOperation(
    'practiceCloud.recordPracticeSessionSync',
    async () => {
      const accessToken = await getAccessTokenForFunctionsInvoke();
      const { data, error } = await supabase.functions.invoke('sync-practice-session', {
        body: {
          session: buildSyncSessionBody(session),
          attempts: attemptPayloads,
          curriculum,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        const body =
          data && typeof data === 'object' && data !== null
            ? (data as { code?: string; message?: string; error?: string })
            : null;
        const detail = body
          ? [body.code, body.message ?? body.error].filter(Boolean).join(': ')
          : '';
        const base = mapPracticeCloudError(error);
        throw new Error(detail ? `${base} (${detail})` : base);
      }

      return data;
    },
    {
      curriculum,
      mode: session.mode,
      answers: attemptPayloads.length,
    },
  );
};
