import React, { Suspense, lazy, useEffect, useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DashboardContentProps } from './types';
import {
  SectionCard,
  StatsDisclosure,
  formatPercent,
  formatSessionDate,
  toDateInputValue
} from './shared';

const AdminConsoleScreen = lazy(() => import('../AdminConsoleScreen'));

const DashboardProfileTab: React.FC<DashboardContentProps> = ({
  batchSize,
  examTarget,
  examTargetError,
  identity,
  learningDashboard,
  onSaveExamTarget,
  onSignOut,
  questionsCount,
  savingExamTarget,
  totalBatches
}) => {
  const [examDateInput, setExamDateInput] = useState(toDateInputValue(examTarget?.examDate));
  const [dailyReviewCapacityInput, setDailyReviewCapacityInput] = useState(
    String(examTarget?.dailyReviewCapacity ?? learningDashboard?.dailyReviewCapacity ?? 35)
  );
  const [dailyNewCapacityInput, setDailyNewCapacityInput] = useState(
    String(examTarget?.dailyNewCapacity ?? learningDashboard?.dailyNewCapacity ?? 10)
  );

  const readinessLabel = formatPercent(learningDashboard?.readiness ?? null);
  const examTargetUpdatedLabel = examTarget?.updatedAt
    ? formatSessionDate(examTarget.updatedAt)
    : null;

  useEffect(() => {
    setExamDateInput(toDateInputValue(examTarget?.examDate));
    setDailyReviewCapacityInput(
      String(examTarget?.dailyReviewCapacity ?? learningDashboard?.dailyReviewCapacity ?? 35)
    );
    setDailyNewCapacityInput(
      String(examTarget?.dailyNewCapacity ?? learningDashboard?.dailyNewCapacity ?? 10)
    );
  }, [
    examTarget?.dailyNewCapacity,
    examTarget?.dailyReviewCapacity,
    examTarget?.examDate,
    learningDashboard?.dailyNewCapacity,
    learningDashboard?.dailyReviewCapacity
  ]);

  const handleExamTargetSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextDailyReviewCapacity = Math.max(
      5,
      Math.min(200, Number.parseInt(dailyReviewCapacityInput, 10) || 35)
    );
    const nextDailyNewCapacity = Math.max(
      0,
      Math.min(100, Number.parseInt(dailyNewCapacityInput, 10) || 10)
    );

    onSaveExamTarget({
      examDate: examDateInput || null,
      dailyReviewCapacity: nextDailyReviewCapacity,
      dailyNewCapacity: nextDailyNewCapacity
    });
  };

  return (
    <div
      className={`grid gap-3 sm:gap-4 ${
        identity.is_admin ? 'xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start' : ''
      }`}
    >
      <div className="grid gap-3 sm:gap-4">
        <SectionCard className="p-0 border-none bg-transparent overflow-visible">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl shadow-indigo-500/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.15),transparent_40%)]" />
            
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[2rem] border-4 border-white/10 bg-white/5 p-1 backdrop-blur-xl">
                <div className="flex h-full w-full items-center justify-center rounded-[1.6rem] bg-indigo-500/20 text-indigo-100 shadow-inner">
                  <UserRound size={40} />
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="absolute inset-0 bg-indigo-500/10 blur-xl"
                />
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="rounded-full bg-indigo-500/10 border border-indigo-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                    Opositor Nivel {Math.ceil(learningDashboard?.seenQuestions || 0 / 100) + 1}
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    Suscripción Activa
                  </span>
                </div>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {identity.current_username}
                </h2>
                <p className="mt-2 text-indigo-200/60 font-medium">
                  Perfil de {identity.is_admin ? 'Elite Administrator' : 'Opositor Preparado'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Readiness</span>
                    <span className="text-xl font-black text-white">{readinessLabel}</span>
                 </div>
                 <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Vistas</span>
                    <span className="text-xl font-black text-white">{learningDashboard?.seenQuestions || 0}</span>
                 </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Configuracion de examen"
          hint={
            examTargetUpdatedLabel
              ? `Ultima actualizacion ${examTargetUpdatedLabel}`
              : 'Ajusta fecha y carga diaria solo cuando lo necesites.'
          }
        >
          <form onSubmit={handleExamTargetSubmit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              <label className="col-span-2 grid gap-2 xl:col-span-1">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Fecha de examen
                </span>
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(event) => setExamDateInput(event.target.value)}
                  className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] outline-none transition focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Repasos diarios
                </span>
                <input
                  type="number"
                  min={5}
                  max={200}
                  step={1}
                  value={dailyReviewCapacityInput}
                  onChange={(event) => setDailyReviewCapacityInput(event.target.value)}
                  className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] outline-none transition focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Nuevas al dia
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={dailyNewCapacityInput}
                  onChange={(event) => setDailyNewCapacityInput(event.target.value)}
                  className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] outline-none transition focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            {examTargetError ? (
              <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {examTargetError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold leading-5 text-slate-400">
                Sin fecha, el sistema sigue guiando el estudio pero sin compresion por examen.
              </p>
              <button
                type="submit"
                disabled={savingExamTarget}
                className="inline-flex items-center justify-center rounded-[1rem] quantia-bg-gradient px-4 py-3 text-sm font-extrabold text-white shadow-[0_18px_30px_-24px_rgba(141,147,242,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_34px_-24px_rgba(141,147,242,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
              >
                {savingExamTarget ? 'Guardando...' : 'Guardar configuracion'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Cuenta y acceso" hint="Acciones de esta sesion y contexto basico del entorno">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="grid gap-3">
              <p className="text-sm leading-6 text-slate-600">
                Banco visible: {questionsCount} preguntas en {totalBatches} bloques de {batchSize}.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                  Rol {identity.is_admin ? 'admin' : 'alumno'}
                </span>
                {learningDashboard ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                    Readiness {readinessLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-[1rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,245,247,0.94))] px-4 py-3 text-sm font-extrabold text-rose-700 shadow-[0_18px_34px_-28px_rgba(244,114,182,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,242,246,0.96))] hover:shadow-[0_24px_38px_-30px_rgba(244,114,182,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100 active:translate-y-0 active:scale-[0.995]"
            >
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        </SectionCard>
      </div>

      {identity.is_admin ? (
        <SectionCard title="Herramientas admin" hint="Gestion y mantenimiento solo cuando lo necesites">
          <StatsDisclosure
            title="Gestion de alumnos"
            hint="La administracion queda contenida aqui, sin invadir la cuenta."
          >
            <div className="rounded-[1.25rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] p-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]">
              <Suspense
                fallback={
                  <p className="text-sm font-medium text-slate-500">
                    Cargando panel de administracion...
                  </p>
                }
              >
                <AdminConsoleScreen />
              </Suspense>
            </div>
          </StatsDisclosure>
        </SectionCard>
      ) : null}
    </div>
  );
};

export default DashboardProfileTab;
