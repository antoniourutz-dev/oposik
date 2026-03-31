import React, { Suspense, lazy } from 'react';
import HomeScreen from './HomeScreen';
import type { DashboardScreenProps } from './dashboard/types';
import { DashboardTabFallback } from './dashboard/shared';
import { toCoachTwoLineMessage } from '../domain/learningEngine';

const DashboardStatsTab = lazy(() => import('./dashboard/DashboardStatsTab'));
const DashboardStudyTab = lazy(() => import('./dashboard/DashboardStudyTab'));
const DashboardProfileTab = lazy(() => import('./dashboard/DashboardProfileTab'));

/**
 * Home = activación, no dashboard.
 * Tres bloques: acción (hero) → dirección (coach breve) → ejecución (modos).
 * Métricas y gráficos no entran aquí; ver `docs/quantia-home-product.md`.
 */
const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
  const {
    activeTab,
    coachPlan,
    homePausedSession = null,
    identity,
    learningDashboardV2,
    learningDashboard,
    onResumePracticeSession,
    onStartRandom,
    onStartRecommended,
    onStartSimulacro,
    onStartWeakReview,
    questionsCount,
    recentSessions,
    recommendedBatchNumber,
    weakCategories,
  } = props;

  /** Solo sin banco: si el catálogo recarga, no bloquear (antes los clics no hacían nada). */
  const practiceLocked = questionsCount === 0;

  if (activeTab === 'home') {
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

    const hasPausedSession =
      homePausedSession != null &&
      homePausedSession.totalQuestions > 0 &&
      homePausedSession.currentQuestionIndex < homePausedSession.totalQuestions;

    const remainingQuestions = hasPausedSession
      ? Math.max(0, homePausedSession.totalQuestions - homePausedSession.currentQuestionIndex)
      : 0;

    const sessionProgress =
      hasPausedSession && homePausedSession!.totalQuestions > 0
        ? Math.round((homePausedSession!.currentQuestionIndex / homePausedSession!.totalQuestions) * 100)
        : 0;

    const coachMessage = toCoachTwoLineMessage({
      mode: coachPlan.mode,
      tone: coachPlan.tone,
      focusMessage: learningDashboardV2?.focusMessage,
      reasons: coachPlan.reasons,
      summary: coachPlan.summary,
    });

    const coachCtaLabel =
      coachPlan.mode === 'standard'
        ? `Abrir bloque ${recommendedBatchNumber}`
        : coachPlan.mode === 'simulacro'
          ? 'Lanzar simulacro'
          : coachPlan.mode === 'anti_trap'
            ? 'Entrenar anti-trampas'
            : coachPlan.mode === 'random'
              ? 'Abrir sesión aleatoria'
              : 'Iniciar sesión';

    return (
      <div className="pb-10">
        <HomeScreen
          state={{
            name: identity?.current_username ?? 'Alumno',
            streakDays: 0,
            hasActiveSession: hasPausedSession,
            remainingQuestions,
            sessionProgress,
            mistakesPending,
            weakTopicsCount,
            recentAccuracyTrend,
          }}
          practiceLocked={practiceLocked}
          coachMessage={coachMessage}
          coachCtaLabel={coachCtaLabel}
          onCoachCta={() => {
            if (practiceLocked) return;
            onStartRecommended();
          }}
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
