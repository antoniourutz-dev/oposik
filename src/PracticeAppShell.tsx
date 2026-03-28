import React, { Suspense, lazy, useLayoutEffect } from 'react';
import { Database, LoaderCircle } from 'lucide-react';
import BottomDock from './components/BottomDock';
import TopBar from './components/TopBar';
import { usePracticeApp } from './hooks/usePracticeApp';
import { PRACTICE_BATCH_SIZE } from './practiceConfig';

const AuthScreen = lazy(() => import('./components/AuthScreen'));
const DashboardScreen = lazy(() => import('./components/DashboardScreen'));
const GuestDashboardScreen = lazy(() => import('./components/GuestDashboardScreen'));
const GenericDashboardScreen = lazy(() => import('./components/GenericDashboardScreen'));
const QuizScreen = lazy(() => import('./components/QuizScreen'));
const PracticeReviewScreen = lazy(() => import('./components/PracticeReviewScreen'));

const FullscreenLoader: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_12%_0%,rgba(124,182,232,0.18),transparent_26%),radial-gradient(circle_at_88%_8%,rgba(141,147,242,0.2),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(194,223,255,0.16),transparent_28%),linear-gradient(180deg,#f4f8ff_0%,#f7faff_34%,#edf4ff_100%)] px-4">
    <div className="relative overflow-hidden rounded-[1.9rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] px-6 py-8 text-center shadow-[0_28px_70px_-40px_rgba(141,147,242,0.24)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.1),transparent_24%),linear-gradient(135deg,rgba(125,182,232,0.05),transparent_38%)]" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e4fb] bg-white/86 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-600 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.18)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)]" />
          Oposik
        </span>
        <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(141,147,242,0.22))] text-[#7cb6e8] shadow-[0_18px_30px_-22px_rgba(141,147,242,0.22)]">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      </div>
      <p className="relative mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-600">
        {label}
      </p>
    </div>
  </div>
);

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
    loadingQuestions,
    pressureInsights,
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
    setActiveTab
  } = usePracticeApp();
  const navigationScrollKey = view === 'home' ? `home:${activeTab}` : view;
  const contentEnterClass =
    view === 'quiz' || view === 'review' ? 'screen-enter-fixed-safe' : 'screen-enter';
  const topBarSection =
    view === 'home' && (activeTab === 'home' || isGuest || isGenericPlayer) ? undefined : topBarSubtitle;
  const mainTopPadding =
    view === 'quiz'
      ? 'pt-4'
      : view === 'home' && (activeTab === 'home' || isGuest || isGenericPlayer)
        ? 'pt-[4.05rem]'
        : 'pt-[5.2rem]';
  const shellBackgroundClass =
    view === 'home' && (activeTab === 'home' || isGuest || isGenericPlayer) ? 'app-shell-home' : 'app-shell-default';

  useLayoutEffect(() => {
    const scrollRoot = document.scrollingElement;
    scrollRoot?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [navigationScrollKey]);

  if (!authReady) {
    return <FullscreenLoader label="Preparando acceso" />;
  }

  if (!session && !isGuest) {
    return (
      <Suspense fallback={<FullscreenLoader label="Cargando acceso" />}>
        <AuthScreen
          onSignedIn={handleSignedIn}
          onEnterGuest={handleEnterGuest}
          guestBlocksRemaining={guestBlocksRemaining}
          guestMaxBlocks={guestMaxBlocks}
        />
      </Suspense>
    );
  }

  if (!identity || syncingState) {
    return <FullscreenLoader label="Sincronizando cuenta" />;
  }

  return (
    <div className={`min-h-[100dvh] text-slate-900 ${shellBackgroundClass}`}>
      {view !== 'quiz' && <TopBar section={topBarSection} />}
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col">
        <main className={`flex flex-1 flex-col px-4 pb-8 ${mainTopPadding} sm:px-6 lg:px-8 ${view === 'home' ? 'pb-28' : ''}`}>
          {syncError && view === 'home' ? (
            <div className="mx-auto mb-4 w-full max-w-4xl rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {syncError}
            </div>
          ) : null}

          {loadingQuestions ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center py-10">
              <div className="relative w-full overflow-hidden rounded-[2rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] p-8 text-center shadow-[0_30px_70px_-35px_rgba(141,147,242,0.24)] backdrop-blur">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.1),transparent_24%),linear-gradient(135deg,rgba(125,182,232,0.05),transparent_38%)]" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e4fb] bg-white/86 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-600 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.18)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)]" />
                    Oposik
                  </span>
                </div>
                <div className="relative mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(141,147,242,0.22))] text-[#7cb6e8] shadow-[0_20px_34px_-24px_rgba(141,147,242,0.22)]">
                  <LoaderCircle className="h-9 w-9 animate-spin" />
                </div>
                <p className="relative mt-5 text-sm font-black uppercase tracking-[0.22em] text-slate-600">
                  Cargando preguntas
                </p>
              </div>
            </div>
          ) : null}

          {!loadingQuestions && questionsError ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10">
              <div className="w-full rounded-[2rem] border border-rose-200 bg-white/85 p-8 shadow-[0_30px_70px_-35px_rgba(127,29,29,0.28)] backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-700">
                  Error de carga
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  No se ha podido cargar la practica
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{questionsError}</p>
              </div>
            </div>
          ) : null}

          {!loadingQuestions && !questionsError && !isGuest && questionsCount === 0 ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10">
              <div className="w-full rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.32)] backdrop-blur">
                <Database className="h-12 w-12 text-slate-400" />
                <h2 className="mt-5 text-2xl font-black text-slate-900">
                  No hay preguntas visibles todavia
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                  El catalogo de practica no ha devuelto preguntas visibles. Revisa la tabla
                  `preguntas` y sus politicas de acceso.
                </p>
              </div>
            </div>
          ) : null}

          <Suspense fallback={<FullscreenLoader label="Cargando modulo" />}>
            {!loadingQuestions && !questionsError && (isGuest || questionsCount > 0) ? (
              <div key={navigationScrollKey} className={contentEnterClass}>
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
                      identity={identity}
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
                      identity={identity}
                      examTarget={examTarget}
                      examTargetError={examTargetError}
                      savingExamTarget={savingExamTarget}
                      learningDashboard={learningDashboard}
                      coachPlan={coachPlan}
                      pressureInsights={pressureInsights}
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
              </div>
            ) : null}
          </Suspense>
        </main>

        {view === 'home' && !isGuest ? (
          <BottomDock
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            variant={isGenericPlayer ? 'generic' : 'default'}
          />
        ) : null}
      </div>
    </div>
  );
};

export default PracticeAppShell;
