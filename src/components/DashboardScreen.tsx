import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import HomeScreen from './HomeScreen';
import type { DashboardScreenProps } from './dashboard/types';
import { DashboardTabFallback } from './dashboard/shared';
import { buildHomeAdapterOutput } from '../adapters/surfaces/homeAdapter';
import { buildCoachTwoLineMessageV2 } from '../domain/coachCopyV2';
import { readSessionContinuityLineForHome } from '../services/sessionContinuityStorage';
import { buildHomeCoachDecisionTelemetryEvent } from '../adapters/telemetry/buildHomeCoachDecisionTelemetryEvent';
import { dispatchCoachTelemetry } from '../adapters/telemetry/dispatchCoachTelemetry';

const DashboardStatsTab = lazy(() => import('./dashboard/DashboardStatsTab'));
const DashboardStudyTab = lazy(() => import('./dashboard/DashboardStudyTab'));
const DashboardProfileTab = lazy(() => import('./dashboard/DashboardProfileTab'));

/**
 * Home = activación, no dashboard.
 * Jerarquía: coach (hero) → sesión pausada → una alternativa discreta.
 * Métricas y gráficos no entran aquí; ver `docs/quantia-home-product.md`.
 */
const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
  const [sessionContinuityHint, setSessionContinuityHint] = useState<string | null>(null);

  useEffect(() => {
    if (props.activeTab !== 'home') return;
    setSessionContinuityHint(readSessionContinuityLineForHome());
  }, [props.activeTab]);

  const {
    activeTab,
    coachPlan,
    homePausedSession = null,
    identity,
    learningDashboardV2,
    learningDashboard,
    planV2,
    onResumePracticeSession,
    onStartRandom,
    onStartRecommended,
    onStartSimulacro,
    onStartWeakReview,
    questionsCount,
    recentSessions,
    streakDays,
    weakCategories,
    pressureInsightsV2,
    questionScope,
  } = props;

  /** Solo sin banco: si el catálogo recarga, no bloquear (antes los clics no hacían nada). */
  const practiceLocked = questionsCount === 0;

  const hasPausedSession =
    homePausedSession != null &&
    homePausedSession.totalQuestions > 0 &&
    homePausedSession.currentQuestionIndex < homePausedSession.totalQuestions;

  const homeExperience = useMemo(
    () =>
      activeTab === 'home'
        ? buildHomeAdapterOutput({
            planV2,
            coachPlan,
            learningDashboardV2,
            pressureInsightsV2,
            recentSessions,
            homePausedSession,
            streakDays,
            weakCategories,
          })
        : null,
    [
      activeTab,
      planV2,
      coachPlan,
      learningDashboardV2,
      pressureInsightsV2,
      recentSessions,
      homePausedSession,
      streakDays,
      weakCategories,
    ],
  );

  const lastHomeDecisionSigRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'home' || !homeExperience) return;

    const decisionEvent = buildHomeCoachDecisionTelemetryEvent({
      planV2,
      dominantState: homeExperience.dominantState,
      visibleCta: homeExperience.hero.cta,
      learningDashboardV2,
      pressureInsightsV2,
      sessionPaused: hasPausedSession,
      questionScope,
    });

    const sig = [
      decisionEvent.dominantState,
      decisionEvent.primaryAction,
      decisionEvent.visibleCta ?? '',
      decisionEvent.tone,
      decisionEvent.intensity.toFixed(3),
      decisionEvent.urgency,
      decisionEvent.confidence,
      decisionEvent.decisionMeta.grayZoneTriggered,
      decisionEvent.decisionMeta.backlogPresent,
      decisionEvent.decisionMeta.pressurePresent,
      decisionEvent.decisionMeta.sessionPaused,
      decisionEvent.decisionMeta.simulacro,
      decisionEvent.decisionMeta.questionScope ?? '',
      planV2.intensity,
      planV2.duration,
      planV2.reasons.join('\u001e'),
    ].join('|');

    if (lastHomeDecisionSigRef.current === sig) return;
    lastHomeDecisionSigRef.current = sig;
    dispatchCoachTelemetry(decisionEvent);
  }, [
    activeTab,
    homeExperience,
    planV2,
    learningDashboardV2,
    pressureInsightsV2,
    hasPausedSession,
    questionScope,
  ]);

  if (activeTab === 'home' && homeExperience) {
    const mistakesPending = learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.overdueCount ?? 0;
    const weakTopicsCount = weakCategories?.length ?? 0;
    const lastAccuracy =
      recentSessions && recentSessions.length > 0
        ? Math.max(
            0,
            Math.min(1, (Number(recentSessions[0]?.score ?? 0) || 0) / Math.max(1, Number(recentSessions[0]?.total ?? 0) || 0)),
          )
        : null;
    const recentAccuracyTrend: 'up' | 'down' | 'stable' =
      lastAccuracy == null
        ? 'stable'
        : lastAccuracy >= 0.65
          ? 'up'
          : lastAccuracy <= 0.45
            ? 'down'
            : 'stable';

    const remainingQuestions = hasPausedSession
      ? Math.max(0, homePausedSession.totalQuestions - homePausedSession.currentQuestionIndex)
      : 0;

    const sessionProgress =
      hasPausedSession && homePausedSession.totalQuestions > 0
        ? Math.round((homePausedSession.currentQuestionIndex / homePausedSession.totalQuestions) * 100)
        : 0;

    const coachMessage = buildCoachTwoLineMessageV2({
      planV2,
      dominantState: homeExperience.dominantState,
    });

    // En el concepto Lumina el CTA del hero es consistente.
    const coachCtaLabel = homeExperience.hero.cta;

    return (
      <div className="pb-10">
        <HomeScreen
          state={{
            name: identity?.current_username ?? 'Alumno',
            streakDays,
            hasActiveSession: hasPausedSession,
            remainingQuestions,
            sessionProgress,
            mistakesPending,
            weakTopicsCount,
            recentAccuracyTrend,
          }}
          sessionContinuityHint={sessionContinuityHint}
          practiceLocked={practiceLocked}
          coachMessage={coachMessage}
          coachCtaLabel={coachCtaLabel}
          onCoachCta={() => {
            if (practiceLocked) return;
            switch (homeExperience.dominantState) {
              case 'pressure':
                onStartSimulacro();
                return;
              case 'errors':
                onStartWeakReview();
                return;
              default:
                onStartRecommended();
            }
          }}
          pausedSessionCtaLabel={homeExperience.pausedSessionCard?.cta ?? 'Continuar sesión'}
          secondaryOption={
            homeExperience.secondaryOption
              ? {
                  mode: homeExperience.secondaryOption.mode,
                  title: homeExperience.secondaryOption.title,
                  summary: homeExperience.secondaryOption.summary,
                  cta: homeExperience.secondaryOption.cta,
                }
              : null
          }
          onResumePracticeSession={() => {
            if (practiceLocked) return;
            onResumePracticeSession?.();
          }}
          onSelectMode={(mode) => {
            if (practiceLocked) return;
            switch (mode) {
              case 'mistakes':
                onStartWeakReview();
                return;
              case 'weak':
                onStartRecommended();
                return;
              case 'simulacro':
                onStartSimulacro();
                return;
              default:
                onStartRandom();
            }
          }}
        />
      </div>
    );
  }

  const { activeTab: _activeTab, ...tabProps } = props;

  return (
    <Suspense
      fallback={
        <DashboardTabFallback
          label={
            activeTab === 'stats' ? 'Estadisticas' : activeTab === 'study' ? 'Estudio' : 'Perfil'
          }
        />
      }
    >
      {activeTab === 'stats' ? <DashboardStatsTab {...tabProps} /> : null}
      {activeTab === 'study' ? <DashboardStudyTab {...tabProps} /> : null}
      {activeTab === 'profile' ? <DashboardProfileTab {...tabProps} /> : null}
    </Suspense>
  );
};

export default DashboardScreen;
