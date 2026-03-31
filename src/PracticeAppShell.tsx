import React, { Suspense, lazy, useLayoutEffect, useMemo } from 'react';
import { AppLoadingSurface, CatalogSyncBanner } from './components/ui/app-loading-surface';
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

const PracticeAppShell: React.FC = () => {
  const {
    activeSession,
    activeTab,
    answers,
    authReady,
    coachPlan,
    currentQuestion,
    currentQuestionIndex,
    examTarget,
    examTargetError,
    guestBlocksRemaining,
    guestMaxBlocks,
    goHome,
    handleAnswer,
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
    syncingState,
    syncError,
    topBarSubtitle,
    totalBatches,
    view,
    weakCategories,
    weakQuestions,
    onStartLawTraining,
    setActiveTab,
  } = usePracticeApp();
  const navigationScrollKey = view === 'home' ? `home:${activeTab}` : view;
  const contentEnterClass =
    view === 'quiz' || view === 'review' ? 'screen-enter-fixed-safe' : 'screen-enter';
  const topBarSection =
    view === 'home' && (activeTab === 'home' || isGuest || isGenericPlayer)
      ? undefined
      : topBarSubtitle;
  const mainTopPadding =
    view === 'quiz'
      ? 'pt-4'
      : view === 'home' && (activeTab === 'home' || isGuest || isGenericPlayer)
        ? 'pt-[4.05rem]'
        : 'pt-[5.2rem]';
  const shellBackgroundClass =
    view === 'home' && (activeTab === 'home' || isGuest || isGenericPlayer)
      ? 'app-shell-home'
      : 'app-shell-default';
  const showDesktopRail = view === 'home' && !isGuest;
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
        view === 'quiz' || view === 'review' ? (activeSession?.questions.length ?? 0) : undefined,
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
    return <AppLoadingSurface label="Preparando acceso" />;
  }

  if (!session && !isGuest) {
    return (
      <Suspense fallback={<AppLoadingSurface label="Cargando acceso" />}>
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
      {view !== 'quiz' && <TopBar section={topBarSection} />}
      <div className="flex min-h-[100dvh] w-full flex-col px-3 sm:px-5 lg:px-5 xl:px-6 2xl:px-8">
        <div
          className={`flex flex-1 flex-col ${showDesktopRail ? 'xl:grid xl:grid-cols-[92px_minmax(0,1fr)] xl:gap-5 2xl:grid-cols-[98px_minmax(0,1fr)] 2xl:gap-6' : ''}`}
        >
          {showDesktopRail ? (
            <BottomDock
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              variant={isGenericPlayer ? 'generic' : 'default'}
            />
          ) : null}

          <main
            className={`flex flex-1 flex-col px-1 pb-8 ${mainTopPadding} sm:px-2 lg:px-2 xl:px-0 ${view === 'home' ? 'pb-28 xl:pb-12' : ''}`}
          >
            {syncError && view === 'home' ? (
              <div className="mx-auto mb-4 w-full max-w-4xl">
                <Alert variant="warning" title="Sincronización pendiente">
                  {syncError}
                </Alert>
              </div>
            ) : null}

            {view === 'home' && !isGuest ? (
              <CatalogSyncBanner syncingAccount={syncingState} loadingCatalog={loadingQuestions} />
            ) : null}

            {questionsError ? (
              <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10">
                <div className="w-full ui-surface-solid p-8">
                  <p className="ui-label text-rose-700">Error de carga</p>
                  <h2 className="mt-2 text-2xl ui-title">No se ha podido cargar la práctica</h2>
                  <p className="mt-3 ui-body">{questionsError}</p>
                  <div className="mt-5">
                    <Alert variant="error" title="Detalle">
                      Reintenta en unos segundos. Si persiste, revisa tu conexión o vuelve a abrir la app.
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
                    El catálogo de práctica no ha devuelto preguntas visibles. Revisa la tabla `preguntas` y sus
                    políticas de acceso.
                  </p>
                </div>
              </div>
            ) : null}

            <Suspense fallback={<AppLoadingSurface label="Cargando módulo" />}>
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
                          examTarget={examTarget}
                          examTargetError={examTargetError}
                          savingExamTarget={savingExamTarget}
                          learningDashboard={learningDashboard}
                          learningDashboardV2={learningDashboardV2}
                          coachPlan={coachPlan}
                          pressureInsights={pressureInsights}
                          pressureInsightsV2={pressureInsightsV2}
                          profile={profile}
                          recentSessions={recentSessions}
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
                          onSignOut={() => void handleSignOut()}
                        />
                      )
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
                          onAnswer={handleAnswer}
                          onEndSession={handleEndSessionEarly}
                          onTimeExpired={handleSimulacroTimeExpired}
                        />
                      </div>
                    ) : null}

                    {view === 'review' && activeSession ? (
                      <div>
                        <PracticeReviewScreen
                          answers={answers}
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
