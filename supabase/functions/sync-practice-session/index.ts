import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { updateQuestionState } from '../_shared/learning-engine/updateQuestionState.ts';
import { scoreRecentAttempt, computeLatencyFactor } from '../_shared/learning-engine/probability.ts';
import type { UserQuestionState, RecentPerformanceScore } from '../_shared/learning-engine/types.ts';
import { createSupabaseServiceClient, requireAuthenticatedUser } from '../_shared/auth.ts';
import { parseSyncPracticeSessionPayload } from '../_shared/syncPracticePayload.ts';
import {
  attemptDedupKey,
  dedupeAttemptsStable,
  partitionAttemptsByExistingKeys,
} from '../_shared/syncAttemptDeduplication.ts';
import { createEdgeLogger, safeUserId } from '../_shared/observability.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

/** `get_my_practice_profile` lee `practice_profiles`, no `practice_sessions`. Sin esto el índice no avanza tras sync. */
const applyStandardNextBatchToProfile = async (
  adminClient: ReturnType<typeof createClient>,
  args: { userId: string; curriculum: string; sessionMode: string; nextStandardBatchStartIndex: number | null },
) => {
  if (args.sessionMode !== 'standard') return;
  const idx = Math.max(0, args.nextStandardBatchStartIndex ?? 0);
  const { error } = await adminClient
    .schema('app')
    .from('practice_profiles')
    .update({ next_standard_batch_start_index: idx })
    .eq('user_id', args.userId)
    .eq('curriculum', args.curriculum);
  if (error) throw error;
};

Deno.serve(async (req) => {
  const log = createEdgeLogger('sync-practice-session', req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    log.warn('request.method_not_allowed', { method: req.method }, 'METHOD_NOT_ALLOWED', 405);
    return new Response(JSON.stringify({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const adminClient = supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : createSupabaseServiceClient();

    const { user } = await requireAuthenticatedUser(req);

    const parsed = parseSyncPracticeSessionPayload(await req.json(), { maxAttempts: 200 });
    if (!parsed.ok) {
      log.warn(
        'payload.invalid',
        { code: parsed.code, status: parsed.status },
        parsed.code,
        parsed.status,
      );
      return new Response(JSON.stringify({ code: parsed.code, message: parsed.message }), {
        status: parsed.status,
        headers: corsHeaders,
      });
    }

    const { session, attempts: rawAttempts, curriculum } = parsed.value;
    const attempts = dedupeAttemptsStable(rawAttempts);
    const attemptsInPayload = attempts.length;

    log.info('sync.start', {
      userId: safeUserId(user.id),
      curriculum,
      attemptsRaw: rawAttempts.length,
      attemptsDeduped: attemptsInPayload,
      sessionId: session.id,
    });

    const sessionRow = {
      session_id: session.id,
      user_id: user.id,
      curriculum,
      mode: session.mode,
      title: session.title,
      started_at: session.startedAt,
      finished_at: new Date().toISOString(),
      score: attempts.filter((a) => a.is_correct).length,
      total: attempts.length,
      batch_number: session.batchNumber,
      batch_size: session.batchSize,
      batch_start_index: session.batchStartIndex,
      next_standard_batch_start_index: session.nextStandardBatchStartIndex,
    };

    const { error: sessionFirstError } = await adminClient
      .schema('app')
      .from('practice_sessions')
      .upsert(sessionRow, { onConflict: 'session_id' });

    if (sessionFirstError) {
      log.error('db.record_session_failed', sessionFirstError, undefined, 'SYNC_FAILED', 500);
      throw sessionFirstError;
    }

    const { data: existingEventRows } = await adminClient
      .schema('app')
      .from('question_attempt_events')
      .select('question_id, answered_at')
      .eq('session_id', session.id)
      .eq('user_id', user.id);

    const existingKeys = new Set(
      (existingEventRows ?? []).map((r) =>
        attemptDedupKey(String(r.question_id), String(r.answered_at)),
      ),
    );

    const { pending, duplicateIgnored } = partitionAttemptsByExistingKeys(attempts, existingKeys);

    const attemptsProcessed = pending.length;
    const syncKind =
      attemptsProcessed === 0 && duplicateIgnored > 0
        ? 'duplicate_only'
        : duplicateIgnored > 0
          ? 'mixed'
          : 'full';

    if (pending.length === 0) {
      await adminClient.schema('app').rpc('ensure_practice_profile', { p_user_id: user.id, p_curriculum: curriculum });
      await applyStandardNextBatchToProfile(adminClient, {
        userId: user.id,
        curriculum,
        sessionMode: session.mode,
        nextStandardBatchStartIndex: session.nextStandardBatchStartIndex,
      });

      const { data: newDashboard } = await adminClient
        .schema('app')
        .rpc('get_readiness_dashboard', {
          p_curriculum: curriculum,
          p_user_id: user.id,
        })
        .maybeSingle();

      log.info('sync.duplicate_ignored', {
        durationMs: log.durationMs(),
        userId: safeUserId(user.id),
        sessionId: session.id,
        attemptsInPayload,
        attemptsDuplicateIgnored: duplicateIgnored,
        syncKind,
      });

      return new Response(
        JSON.stringify({
          success: true,
          dashboard: newDashboard,
          sync: {
            attemptsProcessed: 0,
            attemptsDuplicateIgnored: duplicateIgnored,
            attemptsInPayload,
            syncKind,
          },
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    const questionIds = [...new Set(pending.map((a) => a.question_id))];

    const { data: currentStates } = await adminClient
      .schema('app')
      .from('user_question_state')
      .select('*')
      .eq('user_id', user.id)
      .eq('curriculum', curriculum)
      .in('question_id', questionIds);

    const statesMap = new Map<string, UserQuestionState | null>(
      (currentStates ?? []).map((s) => [s.question_id, s as UserQuestionState]),
    );

    const { data: recentEvents } = await adminClient
      .schema('app')
      .from('question_attempt_events')
      .select('question_id, is_correct, response_time_ms')
      .eq('user_id', user.id)
      .eq('curriculum', curriculum)
      .in('question_id', questionIds)
      .order('answered_at', { ascending: false });

    const recentScoresMap = new Map<string, RecentPerformanceScore[]>();
    recentEvents?.forEach((ev) => {
      const list = recentScoresMap.get(ev.question_id) || [];
      if (list.length < 5) {
        const score = scoreRecentAttempt({
          isCorrect: ev.is_correct,
          latencyFactor: computeLatencyFactor(ev.response_time_ms),
        });
        list.push(score);
      }
      recentScoresMap.set(ev.question_id, list);
    });

    const { data: examTarget } = await adminClient
      .schema('app')
      .from('exam_targets')
      .select('exam_date')
      .eq('user_id', user.id)
      .eq('curriculum', curriculum)
      .maybeSingle();

    type NextState = ReturnType<typeof updateQuestionState>['nextState'];
    const statesByQuestionId = new Map<string, NextState>();
    const attemptEvents: Record<string, unknown>[] = [];

    for (const rawAttempt of pending) {
      const prevState = (statesMap.get(rawAttempt.question_id) as UserQuestionState | null) ?? null;
      const recentScores = recentScoresMap.get(rawAttempt.question_id) || [];

      const transition = updateQuestionState({
        previousState: prevState,
        attempt: {
          userId: user.id,
          curriculum,
          questionId: rawAttempt.question_id,
          questionNumber: rawAttempt.question_number ?? null,
          statement: rawAttempt.statement || 'Pregunta',
          category: rawAttempt.category ?? null,
          explanation: rawAttempt.explanation ?? null,
          answeredAt: rawAttempt.answered_at,
          responseTimeMs: rawAttempt.response_time_ms ?? null,
          timeToFirstSelectionMs: rawAttempt.time_to_first_selection_ms ?? null,
          selectedOption: rawAttempt.selected_option ?? null,
          correctOption: rawAttempt.correct_option ?? 'a',
          isCorrect: rawAttempt.is_correct,
          errorTypeInferred: rawAttempt.error_type_inferred,
          changedAnswer: rawAttempt.changed_answer,
          globalDifficulty: 1,
        },
        recentScores,
        examDate: examTarget?.exam_date ? new Date(examTarget.exam_date) : null,
      });

      statesMap.set(rawAttempt.question_id, transition.nextState as unknown as UserQuestionState);
      statesByQuestionId.set(rawAttempt.question_id, transition.nextState);

      attemptEvents.push({
        user_id: user.id,
        question_id: rawAttempt.question_id,
        session_id: session.id,
        curriculum,
        answered_at: rawAttempt.answered_at,
        selected_option: rawAttempt.selected_option,
        correct_option: rawAttempt.correct_option,
        is_correct: rawAttempt.is_correct,
        response_time_ms: rawAttempt.response_time_ms,
        changed_answer: rawAttempt.changed_answer,
        error_type_inferred: rawAttempt.error_type_inferred,
        mastery_before: prevState?.masteryLevel ?? 0,
        mastery_after: transition.nextState.masteryLevel,
        p_correct_before: prevState?.pCorrectEstimated ?? 0,
        p_correct_after: transition.nextState.pCorrectEstimated,
        stability_before: prevState?.stabilityScore ?? 1,
        stability_after: transition.nextState.stabilityScore,
        next_review_before: prevState?.nextReviewAt ?? null,
        next_review_after: transition.nextState.nextReviewAt,
      });
    }

    const resultStates = [...statesByQuestionId.values()];

    const { error: upsertError } = await adminClient
      .schema('app')
      .from('user_question_state')
      .upsert(
        resultStates.map((s) => ({
          user_id: user.id,
          curriculum,
          question_id: s.questionId,
          question_number: s.questionNumber,
          statement: s.statement,
          category: s.category,
          explanation: s.explanation,
          attempts: s.attempts,
          correct_attempts: s.correctAttempts,
          incorrect_attempts: s.incorrectAttempts,
          consecutive_correct: s.consecutiveCorrect,
          consecutive_incorrect: s.consecutiveIncorrect,
          distinct_successful_days: s.distinctSuccessfulDays,
          last_result: s.lastResult,
          last_selected_option: s.lastSelectedOption,
          last_seen_at: s.lastSeenAt,
          last_correct_at: s.lastCorrectAt,
          next_review_at: s.nextReviewAt,
          mastery_level: s.masteryLevel,
          stability_score: s.stabilityScore,
          retrievability_score: s.retrievabilityScore,
          p_correct_estimated: s.pCorrectEstimated,
          avg_response_time_ms: s.avgResponseTimeMs,
          median_response_time_ms: s.medianResponseTimeMs,
          last_response_time_ms: s.lastResponseTimeMs,
          fast_correct_count: s.fastCorrectCount,
          slow_correct_count: s.slowCorrectCount,
          lapse_count: s.lapseCount,
          exam_retention_probability: s.examRetentionProbability,
          reviews_needed_before_exam: s.reviewsNeededBeforeExam,
          dominant_error_type: s.dominantErrorType,
          times_explanation_opened: s.timesExplanationOpened,
          times_changed_answer: s.timesChangedAnswer,
        })),
        { onConflict: 'user_id,curriculum,question_id' },
      );

    if (upsertError) {
      log.error('db.upsert_question_state_failed', upsertError, undefined, 'SYNC_FAILED', 500);
      throw upsertError;
    }

    const { error: sessionFinalError } = await adminClient
      .schema('app')
      .from('practice_sessions')
      .upsert(
        {
          ...sessionRow,
          finished_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' },
      );

    if (sessionFinalError) {
      log.error('db.record_session_failed', sessionFinalError, undefined, 'SYNC_FAILED', 500);
      throw sessionFinalError;
    }

    const { error: eventsError } = await adminClient
      .schema('app')
      .from('question_attempt_events')
      .upsert(attemptEvents, {
        onConflict: 'session_id,question_id,answered_at',
        ignoreDuplicates: true,
      });

    if (eventsError) {
      log.error('db.record_attempt_events_failed', eventsError, undefined, 'SYNC_FAILED', 500);
      throw eventsError;
    }

    await adminClient.schema('app').rpc('ensure_practice_profile', { p_user_id: user.id, p_curriculum: curriculum });
    await applyStandardNextBatchToProfile(adminClient, {
      userId: user.id,
      curriculum,
      sessionMode: session.mode,
      nextStandardBatchStartIndex: session.nextStandardBatchStartIndex,
    });

    const { data: newDashboard, error: dashboardError } = await adminClient
      .schema('app')
      .rpc('get_readiness_dashboard', {
        p_curriculum: curriculum,
        p_user_id: user.id,
      })
      .maybeSingle();

    if (dashboardError) {
      log.warn('db.readiness_dashboard_failed', { status: 200 }, 'SYNC_FAILED', 200);
    }

    log.info('sync.success', {
      durationMs: log.durationMs(),
      userId: safeUserId(user.id),
      sessionId: session.id,
      attemptsInPayload,
      attemptsProcessed,
      attemptsDuplicateIgnored: duplicateIgnored,
      syncKind,
    });

    if (syncKind === 'mixed') {
      log.info('sync.partial', {
        attemptsProcessed,
        attemptsDuplicateIgnored: duplicateIgnored,
        sessionId: session.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dashboard: newDashboard,
        sync: {
          attemptsProcessed,
          attemptsDuplicateIgnored: duplicateIgnored,
          attemptsInPayload,
          syncKind,
        },
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: unknown) {
    log.error('sync.failed', error, { durationMs: log.durationMs() }, 'SYNC_FAILED');
    const msg = String((error as { message?: string })?.message || '');
    const isSyntaxError =
      error instanceof SyntaxError || (error instanceof Error && error.name === 'SyntaxError');
    const status =
      msg === 'missing_authorization' ? 401 : isSyntaxError ? 400 : 500;
    return new Response(
      JSON.stringify({
        error: 'SYNC_FAILED',
        message: 'No se ha podido sincronizar la sesion.',
      }),
      {
        status,
        headers: corsHeaders,
      },
    );
  }
});
