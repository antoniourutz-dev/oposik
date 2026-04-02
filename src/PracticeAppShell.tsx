import React, { Suspense, lazy, useLayoutEffect, useMemo } from 'react';
import { AppLoadingSurface } from './components/ui/app-loading-surface';
const DatabaseSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);
import BottomDock from './components/BottomDock';
import TopBar from './components/TopBar';
import { Alert } from './components/ui/alert';
import { usePracticeApp } from './hooks/usePracticeApp';
import { getScreenTelemetryKey, useNavigationTelemetry } from './hooks/useNavigationTelemetry';
import { PRACTICE_BATCH_SIZE } from './practiceConfig';
import ScreenTelemetryBoundary from './telemetry/ScreenTelemetryBoundary';

const AuthScreen = lazy(() => import('./components/AuthScreen'));
const DashboardScreen = lazy(() => import('./components/DashboardScreen'));
const GuestDashboardScreen = lazy(() => import('./components/GuestDashboardScreen'));
const GenericDashboardScreen = lazy(() => import('./components/GenericDashboardScreen'));
const QuizScreen = lazy(() => import('./components/QuizScreen'));
const PracticeReviewScreen = lazy(() => import('./components/PracticeReviewScreen'));
const CatalogReviewScreen = lazy(() => import('./components/CatalogReviewScreen'));

const PracticeAppShell: React.FC = () => {
  const {
    activeSession,
    activeTab,
    answers,
    authReady,
    coachPlan,
    planV2,
    currentQuestion,
    currentQuestionIndex,
    examTarget,
    examTargetError,
    guestBlocksRemaining,
    guestMaxBlocks,
    goHome,
    handleAnswer,
    handleCatalogReviewNext,
    handleContinueAfterReview,
    handleEnterGuest,
    handleEndSessionEarly,
    handleQuestionScopeChange,
    handleRetrySession,
    handleSaveExamTarget,
    handleSignedIn,
    handleSignOut,
    handleSimulacroTimeExpired,
    identity,
    isGuest,
    isGenericPlayer,
    learningDashboard,
    learningDashboardV2,
    loadingQuestions,
    pressureInsights,
    pressureInsightsV2,
    profile,
    questionsCount,
    questionsError,
    recentSessions,
    reloadPracticeData,
    recommendedBatchNumber,
    selectedQuestionScope,
    savingExamTarget,
    session,
    startSimulacro,
    startAntiTrap,
    startFromBeginning,
    startGenericRecommended,
    startGuest,
    startMixed,
    startRandom,
    startRecommended,
    startWeakReview,
    startCatalogReview,
    totalBatches,
    view,
    weakCategories,
    weakQuestions,
    onStartLawTraining,
    onStartTopicTraining,
    setActiveTab,
    resumeActiveSession,
    textHighlightingEnabled,
    setTextHighlightingEnabled,
  } = usePracticeApp();
  const navigationScrollKey = view === 'home' ? `home:${activeTab}` : view;
  const contentEnterClass =
    view === 'quiz' || view === 'review' || view === 'catalog_review'
      ? 'screen-enter-fixed-safe'
      : 'screen-enter';
  const streakDays = useMemo(() => {
    const finishedKeys = new Set(
      (recentSessions ?? [])
        .map((s) => {
          const d = new Date(s.finishedAt);
          if (Number.isNaN(d.getTime())) return null;
          return d.toISOString().slice(0, 10);
        })
        .filter((v): v is string => Boolean(v)),
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    for (;;) {
      const d = new Date(today);
      d.setDate(today.getDate() - streak);
      const key = d.toISOString().slice(0, 10);
      if (!finishedKeys.has(key)) break;
      streak += 1;
    }
    return streak;
  }, [recentSessions]);

  const mainTopPadding =
    view === 'quiz' || view === 'catalog_review' || view === 'review' ? 'pt-4' : 'pt-[5.2rem]';
  const shellBackgroundClass =
    view === 'home' && (activeTab === 'home' || isGuest || isGenericPlayer)
      ? 'app-shell-home'
      : 'app-shell-default';
  const showDesktopRail = !isGuest && view === 'home';
  const shouldHideDockOnMobile = view !== 'home';
  const screenTelemetryKey = useMemo(
    () =>
      getScreenTelemetryKey({
        activeTab,
        isGenericPlayer,
        isGuest,
        view,
      }),
    [activeTab, isGenericPlayer, isGuest, view],
  );
  const screenTelemetryMeta = useMemo(
    () => ({
      activeTab,
      isGenericPlayer,
      isGuest,
      questionCount:
        view === 'quiz' || view === 'review' || view === 'catalog_review'
          ? (activeSession?.questions.length ?? 0)
          : undefined,
      selectedScope: selectedQuestionScope,
      sessionMode: activeSession?.mode,
      view,
    }),
    [
      activeSession?.mode,
      activeSession?.questions.length,
      activeTab,
      isGenericPlayer,
      isGuest,
      selectedQuestionScope,
      view,
    ],
  );

  useNavigationTelemetry({
    activeTab,
    isGenericPlayer,
    isGuest,
    view,
  });

  useLayoutEffect(() => {
    const scrollRoot = document.scrollingElement;
    scrollRoot?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [navigationScrollKey]);

  if (!authReady) {
    return <AppLoadingSurface />;
  }

  if (!session && !isGuest) {
    return (
      <Suspense fallback={<AppLoadingSurface />}>
        <AuthScreen
          onSignedIn={handleSignedIn}
          onEnterGuest={handleEnterGuest}
          guestBlocksRemaining={guestBlocksRemaining}
          guestMaxBlocks={guestMaxBlocks}
        />
      </Suspense>
    );
  }

  return (
    <div className={`min-h-[100dvh] text-slate-900 ${shellBackgroundClass}`}>
      {view !== 'quiz' && view !== 'catalog_review' && view !== 'review' ? (
        <TopBar userName={identity?.current_username ?? 'Alumno'} streakDays={streakDays} />
      ) : null}
      <div className="flex min-h-[100dvh] w-full flex-col px-3 sm:px-5 lg:px-5 xl:px-6 2xl:px-8">
        <div
          className={`flex flex-1 flex-col ${showDesktopRail ? 'xl:grid xl:grid-cols-[92px_minmax(0,1fr)] xl:gap-5 2xl:grid-cols-[98px_minmax(0,1fr)] 2xl:gap-6' : ''}`}
        >
          {showDesktopRail ? (
            <BottomDock
              activeTab={activeTab}
              onChangeTab={(tab) => {
                setActiveTab(tab);
              }}
              variant={isGenericPlayer ? 'generic' : 'default'}
              hideOnMobile={shouldHideDockOnMobile}
            />
          ) : null}

          <main
            className={`flex flex-1 flex-col px-1 pb-8 ${mainTopPadding} sm:px-2 lg:px-2 xl:px-0 ${view === 'home' ? 'pb-28 xl:pb-12' : ''}`}
          >
            {view === 'home' && activeSession && !isGuest ? (
              <div className="mx-auto mb-4 w-full max-w-4xl">
                <Alert variant="info" title="Sesión en curso">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-0">
                      Continúa donde lo dejaste (
                      {activeSession.mode === 'catalog_review'
                        ? `${currentQuestionIndex + 1}/${activeSession.questions.length}`
                        : `${Math.min(activeSession.questions.length, answers.length + 1)}/${activeSession.questions.length}`}
                      )
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resumeActiveSession}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-slate-950 px-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.35)] transition-transform active:scale-[0.98]"
                      >
                        Continuar
                      </button>
                      <button
                        type="button"
                        onClick={goHome}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300/80 bg-white/80 px-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-700 transition-transform active:scale-[0.98]"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </Alert>
              </div>
            ) : null}

            {questionsError ? (
              <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10">
                <div className="w-full ui-surface-solid p-8">
                  <p className="ui-label text-rose-700">Error de carga</p>
                  <h2 className="mt-2 text-2xl ui-title">No se ha podido cargar la práctica</h2>
                  <p className="mt-3 ui-body">{questionsError}</p>
                  <div className="mt-5">
                    <Alert variant="error" title="Detalle">
                      Reintenta en unos segundos. Si persiste, revisa tu conexión o vuelve a abrir
                      la app.
                    </Alert>
                  </div>
                </div>
              </div>
            ) : null}

            {!loadingQuestions && !questionsError && !isGuest && questionsCount === 0 ? (
              <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10">
                <div className="w-full ui-surface-solid p-8">
                  <DatabaseSVG className="h-12 w-12 text-slate-400" />
                  <h2 className="mt-5 text-2xl ui-title">No hay preguntas visibles todavía</h2>
                  <p className="mt-3 ui-body">
                    Aún no hay preguntas disponibles. Prueba de nuevo en unos minutos o comprueba tu
                    conexión.
                  </p>
                </div>
              </div>
            ) : null}

            <Suspense fallback={<AppLoadingSurface />}>
              {!questionsError && (isGuest || loadingQuestions || questionsCount > 0) ? (
                <div key={navigationScrollKey} className={contentEnterClass}>
                  <ScreenTelemetryBoundary
                    key={screenTelemetryKey}
                    screen={screenTelemetryKey}
                    meta={screenTelemetryMeta}
                  >
                    {view === 'home' ? (
                      isGuest ? (
                        <GuestDashboardScreen
                          remainingBlocks={guestBlocksRemaining}
                          maxBlocks={guestMaxBlocks}
                          loading={loadingQuestions}
                          onStart={startGuest}
                          onExit={() => void handleSignOut()}
                        />
                      ) : isGenericPlayer ? (
                        <GenericDashboardScreen
                          activeTab={activeTab}
                          identity={identity!}
                          catalogLoading={loadingQuestions}
                          profile={profile}
                          recentSessions={recentSessions}
                          weakQuestionCount={weakQuestions.length}
                          questionScope={selectedQuestionScope}
                          onQuestionScopeChange={handleQuestionScopeChange}
                          onStartSimple={startGenericRecommended}
                          onStartRandom={startRandom}
                          onStartWeakReview={startWeakReview}
                          onStartFromBeginning={startFromBeginning}
                          onSignOut={() => void handleSignOut()}
                        />
                      ) : (
                        <DashboardScreen
                          activeTab={activeTab}
                          identity={identity!}
                          catalogLoading={loadingQuestions}
                          homePausedSession={
                            view === 'home' && activeSession
                              ? {
                                  totalQuestions: activeSession.questions.length,
                                  currentQuestionIndex,
                                }
                              : null
                          }
                          onResumePracticeSession={resumeActiveSession}
                          examTarget={examTarget}
                          examTargetError={examTargetError}
                          savingExamTarget={savingExamTarget}
                          learningDashboard={learningDashboard}
                          learningDashboardV2={learningDashboardV2}
                          coachPlan={coachPlan}
                          planV2={planV2}
                          pressureInsights={pressureInsights}
                          pressureInsightsV2={pressureInsightsV2}
                          profile={profile}
                          recentSessions={recentSessions}
                          streakDays={streakDays}
                          questionsCount={questionsCount}
                          totalBatches={totalBatches}
                          batchSize={PRACTICE_BATCH_SIZE}
                          recommendedBatchNumber={recommendedBatchNumber}
                          weakQuestions={weakQuestions}
                          weakCategories={weakCategories}
                          questionScope={selectedQuestionScope}
                          onQuestionScopeChange={handleQuestionScopeChange}
                          onStartRecommended={startRecommended}
                          onStartSimulacro={startSimulacro}
                          onStartAntiTrap={startAntiTrap}
                          onStartMixed={startMixed}
                          onStartRandom={startRandom}
                          onStartFromBeginning={startFromBeginning}
                          onStartWeakReview={startWeakReview}
                          onReloadQuestions={() => void reloadPracticeData()}
                          onSaveExamTarget={(payload) => void handleSaveExamTarget(payload)}
                          onStartLawTraining={onStartLawTraining}
                          onStartTopicTraining={onStartTopicTraining}
                          onStartCatalogReview={startCatalogReview}
                          onSignOut={() => void handleSignOut()}
                          textHighlightingEnabled={textHighlightingEnabled}
                          onTextHighlightingChange={setTextHighlightingEnabled}
                        />
                      )
                    ) : null}

                    {view === 'catalog_review' && currentQuestion && activeSession ? (
                      <div>
                        <CatalogReviewScreen
                          question={currentQuestion}
                          questionIndex={currentQuestionIndex}
                          totalQuestions={activeSession.questions.length}
                          scope={
                            activeSession.questionScope === 'common' ||
                            activeSession.questionScope === 'specific'
                              ? activeSession.questionScope
                              : 'common'
                          }
                          onNext={handleCatalogReviewNext}
                          onExit={goHome}
                          textHighlightingEnabled={textHighlightingEnabled}
                        />
                      </div>
                    ) : null}

                    {view === 'quiz' && currentQuestion && activeSession ? (
                      <div>
                        <QuizScreen
                          mode={activeSession.mode}
                          title={activeSession.title}
                          subtitle={activeSession.subtitle}
                          feedbackMode={activeSession.feedbackMode}
                          startedAt={activeSession.startedAt}
                          timeLimitSeconds={activeSession.timeLimitSeconds}
                          question={currentQuestion}
                          questionIndex={currentQuestionIndex}
                          totalQuestions={activeSession.questions.length}
                          batchNumber={activeSession.batchNumber}
                          totalBatches={activeSession.totalBatches}
                          questionScope={activeSession.questionScope ?? selectedQuestionScope}
                          simplified={isGuest || isGenericPlayer}
                          showCompactProgress={isGenericPlayer}
                          answers={answers}
                          activeSession={activeSession}
                          surfaceContext={{
                            planV2,
                            learningDashboardV2,
                            pressureInsightsV2,
                            weakCategories,
                            recentSessions,
                            streakDays,
                            profile,
                          }}
                          onAnswer={handleAnswer}
                          onEndSession={handleEndSessionEarly}
                          onTimeExpired={handleSimulacroTimeExpired}
                          textHighlightingEnabled={textHighlightingEnabled}
                        />
                      </div>
                    ) : null}

                    {view === 'review' && activeSession ? (
                      <div>
                        <PracticeReviewScreen
                          answers={answers}
                          activeSession={activeSession}
                          surfaceContext={{
                            planV2,
                            learningDashboardV2,
                            pressureInsightsV2,
                            weakCategories,
                            recentSessions,
                            streakDays,
                            profile,
                          }}
                          batchNumber={activeSession.batchNumber}
                          totalBatches={activeSession.totalBatches}
                          sessionId={activeSession.id}
                          curriculum={profile?.curriculum}
                          sessionMode={activeSession.mode}
                          sessionStartedAt={activeSession.startedAt}
                          sessionQuestionCount={activeSession.questions.length}
                          timeLimitSeconds={activeSession.timeLimitSeconds}
                          hasNextBatch={
                            isGuest
                              ? guestBlocksRemaining > 0
                              : activeSession.mode === 'standard' &&
                                activeSession.nextStandardBatchStartIndex !== null &&
                                activeSession.nextStandardBatchStartIndex > 0
                          }
                          title={activeSession.title}
                          subtitle={activeSession.subtitle}
                          continueLabel={activeSession.continueLabel}
                          showRetry={!isGuest && !isGenericPlayer}
                          simplified={isGuest || isGenericPlayer}
                          onRetryBatch={handleRetrySession}
                          onContinue={handleContinueAfterReview}
                          onBackToStart={goHome}
                          textHighlightingEnabled={textHighlightingEnabled}
                        />
                      </div>
                    ) : null}
                  </ScreenTelemetryBoundary>
                </div>
              ) : null}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PracticeAppShell;
