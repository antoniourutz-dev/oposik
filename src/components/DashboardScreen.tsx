import React, { Suspense, lazy } from 'react';
import {
  ArrowRight,
  Brain,
  ChartNoAxesColumn,
  Flame,
  Layers3,
  LogOut,
  RotateCcw,
  Shield,
  Target,
  UserRound
} from 'lucide-react';
import { MainTab } from './BottomDock';
import { AccountIdentity } from '../services/accountApi';
import { PracticeProfile, PracticeSessionSummary, WeakQuestionInsight } from '../practiceTypes';

const AdminConsoleScreen = lazy(() => import('./AdminConsoleScreen'));

type DashboardScreenProps = {
  activeTab: MainTab;
  identity: AccountIdentity;
  profile: PracticeProfile | null;
  recentSessions: PracticeSessionSummary[];
  questionsCount: number;
  totalBatches: number;
  batchSize: number;
  recommendedBatchNumber: number;
  weakQuestions: WeakQuestionInsight[];
  weakCategories: Array<{ category: string; incorrectAttempts: number; attempts: number }>;
  onStartRecommended: () => void;
  onStartRandom: () => void;
  onStartFromBeginning: () => void;
  onStartWeakReview: () => void;
  onReloadQuestions: () => void;
  onSignOut: () => void;
};

const formatSessionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getAccuracy = (correct: number, total: number) =>
  total === 0 ? 0 : Math.round((correct / total) * 100);

const SectionCard: React.FC<React.PropsWithChildren<{ title?: string; hint?: string; className?: string }>> = ({
  title,
  hint,
  className = '',
  children
}) => (
  <section className={`rounded-[1.6rem] border border-white/70 bg-white/86 p-4 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.42)] backdrop-blur sm:p-5 ${className}`}>
    {title ? (
      <div className="mb-3">
        <p className="text-base font-black text-slate-950 sm:text-lg">{title}</p>
        {hint ? <p className="mt-1 text-sm font-medium text-slate-500">{hint}</p> : null}
      </div>
    ) : null}
    {children}
  </section>
);

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  activeTab,
  identity,
  profile,
  recentSessions,
  questionsCount,
  totalBatches,
  batchSize,
  recommendedBatchNumber,
  weakQuestions,
  weakCategories,
  onStartRecommended,
  onStartRandom,
  onStartFromBeginning,
  onStartWeakReview,
  onReloadQuestions,
  onSignOut
}) => {
  const accuracy = getAccuracy(profile?.totalCorrect ?? 0, profile?.totalAnswered ?? 0);

  if (activeTab === 'home') {
    return (
      <div className="grid gap-4">
        <SectionCard className="border-slate-800/60 bg-[linear-gradient(135deg,#0f172a_0%,#13233f_60%,#1d4ed8_100%)] text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-black leading-tight sm:text-3xl">Sigue estudiando</p>
              <p className="mt-1 text-sm font-medium text-slate-200/90">
                Bloques de {batchSize} preguntas para {identity.current_username}.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">Siguiente</p>
              <p className="mt-1 text-lg font-black text-white">Bloque {recommendedBatchNumber}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={onStartRecommended}
              className="inline-flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3.5 text-left text-slate-950 shadow-[0_16px_28px_-18px_rgba(15,23,42,0.5)]"
            >
              <span>
                <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Practica</span>
                <span className="mt-1 block text-lg font-black">Continuar</span>
              </span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              onClick={onStartRandom}
              className="inline-flex items-center justify-between rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-3.5 text-left text-white transition-colors hover:bg-white/15"
            >
              <span>
                <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Aleatorio</span>
                <span className="mt-1 block text-lg font-black">20 mezcladas</span>
              </span>
              <Layers3 size={18} />
            </button>

            <button
              type="button"
              onClick={onStartWeakReview}
              disabled={weakQuestions.length === 0}
              className="inline-flex items-center justify-between rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-3.5 text-left text-white transition-colors hover:bg-white/15 disabled:opacity-45"
            >
              <span>
                <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">Repaso</span>
                <span className="mt-1 block text-lg font-black">Top 5 falladas</span>
              </span>
              <Brain size={18} />
            </button>
          </div>
        </SectionCard>

        <div className="grid gap-4 sm:grid-cols-2">
          <SectionCard title="Resumen" hint="Tu estado actual">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Precision</p>
                <p className="mt-1.5 text-2xl font-black text-slate-950">{accuracy}%</p>
              </div>
              <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Sesiones</p>
                <p className="mt-1.5 text-2xl font-black text-slate-950">{profile?.totalSessions ?? 0}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Acciones" hint="Accesos rapidos">
            <div className="grid gap-3">
              <button
                type="button"
                onClick={onStartFromBeginning}
                className="inline-flex items-center justify-between rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3.5 text-left"
              >
                <span className="text-sm font-black text-slate-900">Empezar desde el bloque 1</span>
                <Layers3 size={18} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={onReloadQuestions}
                className="inline-flex items-center justify-between rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3.5 text-left"
              >
                <span className="text-sm font-black text-slate-900">Sincronizar preguntas</span>
                <RotateCcw size={18} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center justify-between rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3.5 text-left"
              >
                <span className="text-sm font-black text-slate-900">Cerrar sesion</span>
                <LogOut size={18} className="text-slate-400" />
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  if (activeTab === 'stats') {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <SectionCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Precision</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{accuracy}%</p>
              </div>
              <Target className="h-6 w-6 text-emerald-500" />
            </div>
          </SectionCard>
          <SectionCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Respondidas</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{profile?.totalAnswered ?? 0}</p>
              </div>
              <ChartNoAxesColumn className="h-6 w-6 text-sky-500" />
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Radar tematico" hint="Grupos con mas error">
          <div className="space-y-3">
            {weakCategories.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">Aun no hay datos suficientes.</p>
            ) : (
              weakCategories.map((item) => {
                const ratio = Math.round((item.incorrectAttempts / Math.max(item.attempts, 1)) * 100);
                return (
                  <div key={item.category} className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">{item.category}</p>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{ratio}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
                        style={{ width: `${Math.min(100, ratio)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard title="Ultimas sesiones">
          <div className="space-y-3">
            {recentSessions.length ? (
              recentSessions.slice(0, 5).map((session) => (
                <article key={session.id} className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{session.title}</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">{formatSessionDate(session.finishedAt)}</p>
                    </div>
                    <p className="text-lg font-black text-slate-950">{session.score}/{session.total}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm font-medium text-slate-500">Todavia no hay sesiones guardadas.</p>
            )}
          </div>
        </SectionCard>
      </div>
    );
  }

  if (activeTab === 'study') {
    return (
      <div className="grid gap-4">
        <SectionCard title="Estudio guiado" hint="Accesos rapidos">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartWeakReview}
              disabled={weakQuestions.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] bg-slate-950 px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white disabled:opacity-45"
            >
              <Flame size={16} />
              Practicar top 5
            </button>
            <button
              type="button"
              onClick={onStartFromBeginning}
              className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-700"
            >
              <Layers3 size={16} />
              Bloque 1
            </button>
            <button
              type="button"
              onClick={onStartRandom}
              className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-700"
            >
              <Layers3 size={16} />
              Aleatorio
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Preguntas mas falladas">
          <div className="space-y-3">
            {weakQuestions.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">Todavia no hay preguntas marcadas como debiles.</p>
            ) : (
              weakQuestions.map(({ question, stat }, index) => (
                <details key={question.id} className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
                            Top {index + 1}
                          </span>
                          {question.category ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                              {question.category}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-base font-black text-slate-900">
                          Pregunta {question.number ?? question.id}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-rose-50 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">Fallos</p>
                        <p className="mt-1 text-lg font-black text-slate-900">{stat.incorrectAttempts}</p>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[1.2rem] bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Respuesta correcta</p>
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {question.correctOption.toUpperCase()}) {question.options[question.correctOption]}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] bg-amber-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Explicacion</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                        {question.explanation || 'Sin explicacion disponible.'}
                      </p>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <SectionCard title="Perfil" hint="Cuenta activa">
        <div className="flex items-center gap-3 rounded-[1.15rem] bg-slate-50 px-4 py-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
            <UserRound size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Usuario</p>
            <p className="mt-1 text-xl font-black text-slate-950">{identity.current_username}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Cuenta">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Rol</p>
            <p className="mt-1.5 text-2xl font-black text-slate-950">{identity.is_admin ? 'Admin' : 'Alumno'}</p>
          </div>
          <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Banco</p>
            <p className="mt-1.5 text-2xl font-black text-slate-950">{questionsCount}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[1.05rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800"
        >
          <LogOut size={16} />
          Cerrar sesion
        </button>
      </SectionCard>

      <SectionCard title="Ruta actual">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Bloques</p>
            <p className="mt-1.5 text-2xl font-black text-slate-950">{totalBatches}</p>
          </div>
          <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tamano</p>
            <p className="mt-1.5 text-2xl font-black text-slate-950">{batchSize}</p>
          </div>
        </div>
      </SectionCard>

      {identity.is_admin ? (
        <SectionCard title="Panel admin" hint="Gestion de alumnos y analitica">
          <Suspense
            fallback={
              <p className="text-sm font-medium text-slate-500">
                Cargando panel de administracion...
              </p>
            }
          >
            <AdminConsoleScreen />
          </Suspense>
        </SectionCard>
      ) : null}
    </div>
  );
};

export default DashboardScreen;
