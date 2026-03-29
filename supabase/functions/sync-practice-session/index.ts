import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { updateQuestionState } from '../_shared/learning-engine/updateQuestionState.ts';
import { scoreRecentAttempt, computeLatencyFactor } from '../_shared/learning-engine/probability.ts';
import type { AttemptInput, UserQuestionState, RecentPerformanceScore } from '../_shared/learning-engine/types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Invalid user');

    const { session, attempts, curriculum = 'general' } = await req.json();

    if (!Array.isArray(attempts)) throw new Error('Attempts must be an array');

    // 1. Fetch current question states for the involved question IDs
    const questionIds = attempts.map((a: any) => a.question_id);
    const { data: currentStates } = await supabase
      .schema('app')
      .from('user_question_state')
      .select('*')
      .eq('user_id', user.id)
      .eq('curriculum', curriculum)
      .in('question_id', questionIds);

    const statesMap = new Map<string, any>(currentStates?.map(s => [s.question_id, s]) || []);

    // 2. Fetch recent scores (last 5 per question) if needed for probability calculation
    const { data: recentEvents } = await supabase
      .schema('app')
      .from('question_attempt_events')
      .select('question_id, is_correct, response_time_ms')
      .eq('user_id', user.id)
      .eq('curriculum', curriculum)
      .in('question_id', questionIds)
      .order('answered_at', { ascending: false });

    // Map events to RecentPerformanceScore[]
    const recentScoresMap = new Map<string, RecentPerformanceScore[]>();
    recentEvents?.forEach(ev => {
      const list = recentScoresMap.get(ev.question_id) || [];
      if (list.length < 5) {
        const score = scoreRecentAttempt({
          isCorrect: ev.is_correct,
          latencyFactor: computeLatencyFactor(ev.response_time_ms)
        });
        list.push(score);
      }
      recentScoresMap.set(ev.question_id, list);
    });

    const { data: examTarget } = await supabase
      .schema('app')
      .from('exam_targets')
      .select('exam_date')
      .eq('user_id', user.id)
      .eq('curriculum', curriculum)
      .maybeSingle();

    const resultStates: any[] = [];
    const attemptEvents: any[] = [];

    // 3. Process each attempt through the logic
    for (const rawAttempt of attempts) {
      const prevState = statesMap.get(rawAttempt.question_id) as UserQuestionState || null;
      const recentScores = recentScoresMap.get(rawAttempt.question_id) || [];
      
      const transition = updateQuestionState({
        previousState: prevState,
        attempt: {
          userId: user.id,
          curriculum,
          questionId: rawAttempt.question_id,
          questionNumber: rawAttempt.question_number ?? null,
          statement: rawAttempt.statement || 'Pregunta',
          category: rawAttempt.category || null,
          explanation: rawAttempt.explanation || null,
          answeredAt: rawAttempt.answered_at,
          responseTimeMs: rawAttempt.response_time_ms ?? null,
          timeToFirstSelectionMs: rawAttempt.time_to_first_selection_ms ?? null,
          selectedOption: rawAttempt.selected_option || null,
          correctOption: rawAttempt.correct_option || 'a',
          isCorrect: rawAttempt.is_correct,
          errorTypeInferred: rawAttempt.error_type_inferred,
          changedAnswer: !!rawAttempt.changed_answer,
          globalDifficulty: 1 // Default
        },
        recentScores,
        examDate: examTarget?.exam_date ? new Date(examTarget.exam_date) : null
      });

      resultStates.push(transition.nextState);
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
        changed_answer: !!rawAttempt.changed_answer,
        error_type_inferred: rawAttempt.error_type_inferred,
        mastery_before: prevState?.masteryLevel ?? 0,
        mastery_after: transition.nextState.masteryLevel,
        p_correct_before: prevState?.pCorrectEstimated ?? 0,
        p_correct_after: transition.nextState.pCorrectEstimated,
        stability_before: prevState?.stabilityScore ?? 1,
        stability_after: transition.nextState.stabilityScore,
        next_review_before: prevState?.nextReviewAt ?? null,
        next_review_after: transition.nextState.nextReviewAt
      });
    }

    // 4. Persistence
    // Update question states
    const { error: upsertError } = await supabase
      .schema('app')
      .from('user_question_state')
      .upsert(resultStates.map(s => ({
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
        times_changed_answer: s.timesChangedAnswer
      })), { onConflict: 'user_id,curriculum,question_id' });

    if (upsertError) {
      console.error('Error upserting question states:', upsertError);
      throw upsertError;
    }

    // Record session (with upsert to handle retries)
    const { error: sessionError } = await supabase
      .schema('app')
      .from('practice_sessions')
      .upsert({
        session_id: session.id,
        user_id: user.id,
        curriculum,
        mode: session.mode,
        title: session.title,
        started_at: session.startedAt,
        finished_at: new Date().toISOString(),
        score: attempts.filter((a: any) => a.is_correct).length,
        total: attempts.length,
        batch_number: session.batchNumber,
        batch_size: session.batchSize,
        batch_start_index: session.batchStartIndex,
        next_standard_batch_start_index: session.nextStandardBatchStartIndex
      }, { onConflict: 'session_id' });

    if (sessionError) {
      console.error('Error recording practice session:', sessionError);
      throw sessionError;
    }

    // Record events (insert only, but we could deduplicate if needed)
    // To handle retries safely, we might want to check if events for this session already exist
    const { data: existingEvents } = await supabase
      .schema('app')
      .from('question_attempt_events')
      .select('id')
      .eq('session_id', session.id)
      .limit(1);

    if (!existingEvents || existingEvents.length === 0) {
      const { error: eventsError } = await supabase
        .schema('app')
        .from('question_attempt_events')
        .insert(attemptEvents);

      if (eventsError) {
        console.error('Error recording attempt events:', eventsError);
        throw eventsError;
      }
    }

    // 5. Update profile and get new readiness
    await supabase.schema('app').rpc('ensure_practice_profile', { p_user_id: user.id, p_curriculum: curriculum });
    
    // Crucial: Pass p_user_id because auth.uid() is null when using service_role key
    const { data: newDashboard, error: dashboardError } = await supabase
      .schema('app')
      .rpc('get_readiness_dashboard', { 
        p_curriculum: curriculum,
        p_user_id: user.id 
      })
      .maybeSingle();

    if (dashboardError) {
      console.error('Error fetching readiness dashboard:', dashboardError);
      // We don't throw here to avoid failing the whole sync if only the dashboard fetch fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      dashboard: newDashboard 
    }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('sync-practice-session global error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.details || error.hint || null
    }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }
});
