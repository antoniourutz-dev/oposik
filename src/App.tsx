import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Database, LoaderCircle } from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import DashboardScreen from './components/DashboardScreen';
import QuizScreen from './components/QuizScreen';
import PracticeReviewScreen from './components/PracticeReviewScreen';
import BottomDock, { MainTab } from './components/BottomDock';
import TopBar from './components/TopBar';
import ConfigurationErrorScreen from './components/screens/ConfigurationErrorScreen';
import {
  ActivePracticeSession,
  CloudPracticeState,
  OptionKey,
  PracticeAnswer,
  PracticeQuestion
} from './practiceTypes';
import { getMyAccountIdentity, AccountIdentity } from './services/accountApi';
import { getPracticeQuestions } from './services/preguntasApi';
import { getMyPracticeState, recordPracticeSessionInCloud } from './services/practiceCloudApi';
import { getTopWeakQuestions, getWeakCategories } from './utils/practiceStats';
import {
  clearSupabaseAuthStorage,
  getSafeSupabaseSession,
  missingSupabaseEnvVars,
  supabase,
  supabaseConfigError
} from './supabase';

const BATCH_SIZE = 20;
const DEFAULT_CURRICULUM = 'general';

type View = 'home' | 'quiz' | 'review';

const buildSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}`;

const App: React.FC = () => {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [practiceState, setPracticeState] = useState<CloudPracticeState>({
    profile: null,
    recentSessions: [],
    questionStats: []
  });
  const [syncingState, setSyncingState] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [activeSession, setActiveSession] = useState<ActivePracticeSession | null>(null);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoadingQuestions(true);
        setQuestionsError(null);
        setQuestions(await getPracticeQuestions());
      } catch (error) {
        setQuestionsError(
          error instanceof Error ? error.message : 'No se han podido cargar las preguntas.'
        );
      } finally {
        setLoadingQuestions(false);
      }
    };

    void loadQuestions();
  }, []);

  const loadAccountContext = async () => {
    setSyncingState(true);
    setSyncError(null);

    try {
      const [identityResult, practiceResult] = await Promise.allSettled([
        getMyAccountIdentity(),
        getMyPracticeState(DEFAULT_CURRICULUM)
      ]);

      if (identityResult.status === 'rejected') {
        throw identityResult.reason;
      }

      setIdentity(identityResult.value);

      if (practiceResult.status === 'fulfilled') {
        setPracticeState(practiceResult.value);
        return;
      }

      setPracticeState({
        profile: null,
        recentSessions: [],
        questionStats: []
      });
      setSyncError(
        practiceResult.reason instanceof Error
          ? practiceResult.reason.message
          : 'No se ha podido sincronizar el progreso.'
      );
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'No se ha podido sincronizar la cuenta.'
      );
    } finally {
      setSyncingState(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        const currentSession = await getSafeSupabaseSession();
        if (!active) return;

        setSession(currentSession);

        if (currentSession) {
          await loadAccountContext();
        } else {
          setIdentity(null);
          setPracticeState({
            profile: null,
            recentSessions: [],
            questionStats: []
          });
        }
      } catch (error) {
        if (!active) return;
        setSyncError(
          error instanceof Error ? error.message : 'No se ha podido validar la sesion.'
        );
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    };

    void initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      setView('home');
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setActiveSession(null);

      if (nextSession) {
        void loadAccountContext();
      } else {
        setIdentity(null);
        setPracticeState({
          profile: null,
          recentSessions: [],
          questionStats: []
        });
        setSyncError(null);
      }

      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const profile = practiceState.profile;
  const recentSessions = practiceState.recentSessions;
  const questionStats = practiceState.questionStats;

  const totalBatches = Math.max(1, Math.ceil(questions.length / BATCH_SIZE));
  const recommendedBatchStartIndex =
    profile && profile.nextStandardBatchStartIndex < questions.length
      ? profile.nextStandardBatchStartIndex
      : 0;
  const recommendedBatchNumber = Math.floor(recommendedBatchStartIndex / BATCH_SIZE) + 1;

  const weakQuestions = useMemo(
    () => getTopWeakQuestions(questionStats, questions, 5),
    [questionStats, questions]
  );

  const weakCategories = useMemo(
    () => getWeakCategories(questionStats),
    [questionStats]
  );

  const currentQuestion = activeSession?.questions[currentQuestionIndex] ?? null;

  const startSession = (nextSession: ActivePracticeSession | null) => {
    if (!nextSession || nextSession.questions.length === 0) return;
    setActiveSession(nextSession);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setView('quiz');
  };

  const buildStandardSession = (batchStartIndex: number) => {
    const normalizedStartIndex =
      batchStartIndex >= 0 && batchStartIndex < questions.length ? batchStartIndex : 0;
    const batchQuestions = questions.slice(normalizedStartIndex, normalizedStartIndex + BATCH_SIZE);
    if (batchQuestions.length === 0) return null;

    const batchNumber = Math.floor(normalizedStartIndex / BATCH_SIZE) + 1;
    const nextBatchStartIndex =
      normalizedStartIndex + BATCH_SIZE < questions.length ? normalizedStartIndex + BATCH_SIZE : 0;

    return {
      id: buildSessionId(),
      mode: 'standard',
      title: `Bloque ${batchNumber} de ${totalBatches}`,
      subtitle: 'Ruta principal de practica en bloques consecutivos.',
      questions: batchQuestions,
      startedAt: new Date().toISOString(),
      batchNumberLabel: `${batchNumber}/${totalBatches}`,
      batchStartIndex: normalizedStartIndex,
      continueLabel:
        nextBatchStartIndex > 0 ? 'Continuar con las siguientes 20' : 'Volver al panel',
      nextStandardBatchStartIndex: nextBatchStartIndex
    } satisfies ActivePracticeSession;
  };

  const buildWeakestSession = () => {
    const weakestBatch = weakQuestions.map((item) => item.question).slice(0, BATCH_SIZE);
    if (weakestBatch.length === 0) return null;

    return {
      id: buildSessionId(),
      mode: 'weakest',
      title: 'Repaso de preguntas mas falladas',
      subtitle: 'Sesion enfocada en tus errores recurrentes.',
      questions: weakestBatch,
      startedAt: new Date().toISOString(),
      batchNumberLabel: '1/1',
      batchStartIndex: null,
      continueLabel: 'Volver al panel',
      nextStandardBatchStartIndex: null
    } satisfies ActivePracticeSession;
  };

  const goHome = () => {
    setView('home');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setActiveSession(null);
  };

  const topBarSubtitle =
    view === 'review'
      ? 'Revision'
      : activeTab === 'home'
        ? 'Inicio'
        : activeTab === 'stats'
          ? 'Estadisticas'
          : activeTab === 'study'
            ? 'Estudio'
            : 'Perfil';

  const persistSession = async (completedAnswers: PracticeAnswer[]) => {
    if (!activeSession) return;

    try {
      await recordPracticeSessionInCloud(activeSession, completedAnswers, DEFAULT_CURRICULUM);
      const nextPracticeState = await getMyPracticeState(DEFAULT_CURRICULUM);
      setPracticeState(nextPracticeState);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'No se ha podido guardar el progreso.'
      );
    }
  };

  const commitSession = (completedAnswers: PracticeAnswer[]) => {
    setAnswers(completedAnswers);
    setView('review');
    void persistSession(completedAnswers);
  };

  const handleAnswer = (selectedOption: OptionKey) => {
    if (!currentQuestion) return;

    const nextAnswer: PracticeAnswer = {
      question: currentQuestion,
      selectedOption,
      isCorrect: selectedOption === currentQuestion.correctOption
    };

    const completedAnswers = [...answers, nextAnswer];

    if (activeSession && currentQuestionIndex === activeSession.questions.length - 1) {
      commitSession(completedAnswers);
      return;
    }

    setAnswers(completedAnswers);
    setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
  };

  const handleRetrySession = () => {
    if (!activeSession) return;

    startSession({
      ...activeSession,
      id: buildSessionId(),
      startedAt: new Date().toISOString()
    });
  };

  const handleEndSessionEarly = () => {
    if (answers.length === 0) {
      goHome();
      return;
    }

    commitSession(answers);
  };

  const handleContinueAfterReview = () => {
    if (!activeSession) {
      goHome();
      return;
    }

    if (activeSession.mode === 'standard' && activeSession.nextStandardBatchStartIndex) {
      startSession(buildStandardSession(activeSession.nextStandardBatchStartIndex));
      return;
    }

    goHome();
  };

  const handleSignedIn = async () => {
    const currentSession = await getSafeSupabaseSession();
    setSession(currentSession);
    await loadAccountContext();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSupabaseAuthStorage();
    setSession(null);
    setIdentity(null);
    setPracticeState({
      profile: null,
      recentSessions: [],
      questionStats: []
    });
    goHome();
  };

  if (supabaseConfigError) {
    return <ConfigurationErrorScreen missingVars={missingSupabaseEnvVars} />;
  }

  if (!authReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.15),transparent_32%),linear-gradient(180deg,#fffdf8_0%,#f8fafc_45%,#f6f7fb_100%)] px-4">
        <div className="rounded-[1.8rem] border border-white/70 bg-white/86 px-6 py-8 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
          <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-amber-500" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
            Preparando acceso
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onSignedIn={handleSignedIn} />;
  }

  if (!identity || syncingState) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.15),transparent_32%),linear-gradient(180deg,#fffdf8_0%,#f8fafc_45%,#f6f7fb_100%)] px-4">
        <div className="rounded-[1.8rem] border border-white/70 bg-white/86 px-6 py-8 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
          <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-amber-500" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
            Sincronizando cuenta
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.15),transparent_32%),linear-gradient(180deg,#fffdf8_0%,#f8fafc_45%,#f6f7fb_100%)] text-slate-900">
      {view !== 'quiz' && <TopBar section={topBarSubtitle} />}
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col">
        <main className={`flex flex-1 flex-col px-4 pb-8 ${view === 'quiz' ? 'pt-4' : 'pt-24'} sm:px-6 lg:px-8 ${view === 'home' ? 'pb-32' : 'pb-8'}`}>
          {syncError && view === 'home' ? (
            <div className="mx-auto mb-4 w-full max-w-4xl rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {syncError}
            </div>
          ) : null}

          {loadingQuestions && (
            <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center py-10">
              <div className="w-full rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_30px_70px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
                <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-amber-500" />
                <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
                  Cargando preguntas
                </p>
              </div>
            </div>
          )}

          {!loadingQuestions && questionsError && (
            <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10">
              <div className="w-full rounded-[2rem] border border-rose-200 bg-white/85 p-8 shadow-[0_30px_70px_-35px_rgba(127,29,29,0.28)] backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-700">
                  Error de carga
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  No se ha podido leer la tabla `preguntas`
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{questionsError}</p>
              </div>
            </div>
          )}

          {!loadingQuestions && !questionsError && questions.length === 0 && (
            <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10">
              <div className="w-full rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.32)] backdrop-blur">
                <Database className="h-12 w-12 text-slate-400" />
                <h2 className="mt-5 text-2xl font-black text-slate-900">
                  No hay preguntas visibles todavia
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                  La consulta a `preguntas` ha devuelto 0 filas. Revisa si la tabla esta vacia o si
                  las politicas RLS impiden la lectura con la clave publicable.
                </p>
              </div>
            </div>
          )}

          {!loadingQuestions && !questionsError && questions.length > 0 && view === 'home' && (
            <DashboardScreen
              activeTab={activeTab}
              identity={identity}
              profile={profile}
              recentSessions={recentSessions}
              questionsCount={questions.length}
              totalBatches={totalBatches}
              batchSize={BATCH_SIZE}
              recommendedBatchNumber={recommendedBatchNumber}
              weakQuestions={weakQuestions}
              weakCategories={weakCategories}
              onStartRecommended={() => startSession(buildStandardSession(recommendedBatchStartIndex))}
              onStartFromBeginning={() => startSession(buildStandardSession(0))}
              onStartWeakReview={() => startSession(buildWeakestSession())}
              onReloadQuestions={() => {
                setLoadingQuestions(true);
                void getPracticeQuestions()
                  .then((nextQuestions) => {
                    setQuestions(nextQuestions);
                    setQuestionsError(null);
                  })
                  .catch((error) => {
                    setQuestionsError(
                      error instanceof Error ? error.message : 'No se han podido cargar las preguntas.'
                    );
                  })
                  .finally(() => {
                    setLoadingQuestions(false);
                  });
              }}
              onSignOut={() => void handleSignOut()}
            />
          )}

          {!loadingQuestions && !questionsError && questions.length > 0 && view === 'quiz' && currentQuestion && activeSession && (
            <QuizScreen
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={activeSession.questions.length}
              batchNumber={Number(activeSession.batchNumberLabel.split('/')[0])}
              totalBatches={Number(activeSession.batchNumberLabel.split('/')[1])}
              answers={answers}
              onAnswer={handleAnswer}
              onEndSession={handleEndSessionEarly}
            />
          )}

          {!loadingQuestions && !questionsError && questions.length > 0 && view === 'review' && activeSession && (
            <PracticeReviewScreen
              answers={answers}
              batchNumber={Number(activeSession.batchNumberLabel.split('/')[0])}
              totalBatches={Number(activeSession.batchNumberLabel.split('/')[1])}
              hasNextBatch={
                activeSession.mode === 'standard' &&
                activeSession.nextStandardBatchStartIndex !== null &&
                activeSession.nextStandardBatchStartIndex > 0
              }
              title={activeSession.title}
              continueLabel={activeSession.continueLabel}
              onRetryBatch={handleRetrySession}
              onContinue={handleContinueAfterReview}
              onBackToStart={goHome}
            />
          )}
        </main>

        {view === 'home' && (
          <BottomDock activeTab={activeTab} onChangeTab={setActiveTab} />
        )}
      </div>
    </div>
  );
};

export default App;
