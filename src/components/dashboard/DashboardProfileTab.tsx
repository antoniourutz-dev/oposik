import React, { Suspense, lazy, useEffect, useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
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
        <SectionCard title="Cuenta" hint="Acceso activo y configuracion personal">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.12),rgba(141,147,242,0.16))] text-slate-700 shadow-[0_14px_24px_-22px_rgba(141,147,242,0.18)]">
                <UserRound size={22} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Cuenta activa
                </p>
                <p className="mt-1.5 text-[1.35rem] font-black leading-none tracking-[-0.03em] text-slate-950">
                  {identity.current_username}
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  Perfil {identity.is_admin ? 'administrador' : 'alumno'}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.12),rgba(141,147,242,0.16))] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
              {identity.is_admin ? 'Admin' : 'Alumno'}
            </span>
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
                className="inline-flex items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_18px_30px_-24px_rgba(141,147,242,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_34px_-24px_rgba(141,147,242,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
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
