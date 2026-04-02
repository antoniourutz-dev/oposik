import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { SkeletonText } from '../ui/skeleton';
import { Award, Flame, LogOut, UserRound } from 'lucide-react';
import type { DashboardContentProps } from './types';
import {
  SectionCard,
  StatsDisclosure,
  formatSessionDate,
  toDateInputValue,
} from './shared';

const AdminConsoleScreen = lazy(() => import('../AdminConsoleScreen'));

const DashboardProfileTab: React.FC<DashboardContentProps> = ({
  examTarget,
  examTargetError,
  identity,
  learningDashboard,
  onSaveExamTarget,
  onSignOut,
  profile,
  savingExamTarget,
  recentSessions,
  textHighlightingEnabled,
  onTextHighlightingChange,
}) => {
  const initials = useMemo(() => {
    const parts = identity.current_username.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
  }, [identity.current_username]);

  const level = useMemo(() => {
    if (!profile) return 1;
    return Math.max(1, Math.round((profile.totalSessions ?? 0) / 10));
  }, [profile]);

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

  const [examDateInput, setExamDateInput] = useState(toDateInputValue(examTarget?.examDate));
  const [dailyReviewCapacityInput, setDailyReviewCapacityInput] = useState(
    String(examTarget?.dailyReviewCapacity ?? learningDashboard?.dailyReviewCapacity ?? 35),
  );
  const [dailyNewCapacityInput, setDailyNewCapacityInput] = useState(
    String(examTarget?.dailyNewCapacity ?? learningDashboard?.dailyNewCapacity ?? 10),
  );

  const examTargetUpdatedLabel = examTarget?.updatedAt
    ? formatSessionDate(examTarget.updatedAt)
    : null;

  useEffect(() => {
    setExamDateInput(toDateInputValue(examTarget?.examDate));
    setDailyReviewCapacityInput(
      String(examTarget?.dailyReviewCapacity ?? learningDashboard?.dailyReviewCapacity ?? 35),
    );
    setDailyNewCapacityInput(
      String(examTarget?.dailyNewCapacity ?? learningDashboard?.dailyNewCapacity ?? 10),
    );
  }, [
    examTarget?.dailyNewCapacity,
    examTarget?.dailyReviewCapacity,
    examTarget?.examDate,
    learningDashboard?.dailyNewCapacity,
    learningDashboard?.dailyReviewCapacity,
  ]);

  const handleExamTargetSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextDailyReviewCapacity = Math.max(
      5,
      Math.min(200, Number.parseInt(dailyReviewCapacityInput, 10) || 35),
    );
    const nextDailyNewCapacity = Math.max(
      0,
      Math.min(100, Number.parseInt(dailyNewCapacityInput, 10) || 10),
    );

    onSaveExamTarget({
      examDate: examDateInput || null,
      dailyReviewCapacity: nextDailyReviewCapacity,
      dailyNewCapacity: nextDailyNewCapacity,
    });
  };

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-3 pb-12 sm:gap-4 xl:max-w-6xl">
      {/* Lumina Profile header */}
      <div className="text-center pb-2">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-[40px] bg-violet-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-violet-200 border-4 border-white mx-auto mb-4">
            {initials}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-400 p-2 rounded-2xl shadow-lg border-2 border-white">
            <Award className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900">{identity.current_username}</h2>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
          Nivel {level} • Aspirante Pro
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Insignias</h4>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                <Award className="w-5 h-5 text-slate-300" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Racha Máxima</h4>
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-6 h-6 text-orange-500 fill-orange-500" aria-hidden="true" />
            <span className="text-2xl font-black text-slate-900">{streakDays}</span>
          </div>
        </div>
      </div>

      <div
        className={`grid gap-3 sm:gap-4 ${
          identity.is_admin ? 'xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start' : ''
        }`}
      >
      <div className="grid gap-3 sm:gap-4">
        <SectionCard title="Cuenta" hint="Gestiona tu configuración sin ruido">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Usuario</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                {identity.current_username}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Rol: {identity.is_admin ? 'admin' : 'alumno'}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50 text-slate-700">
              <UserRound size={20} aria-hidden />
            </span>
          </div>
        </SectionCard>

        <SectionCard
          title="Lectura"
          hint="Si el marcaje te distrae, puedes ver enunciados y explicaciones en texto plano."
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Resaltar lo importante
              </p>
              <p className="mt-1 text-sm font-medium leading-snug text-slate-600">
                Marcaje editorial en enunciados, opciones y explicaciones.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={textHighlightingEnabled}
              aria-label={
                textHighlightingEnabled ? 'Resaltado activado' : 'Resaltado desactivado'
              }
              onClick={() => onTextHighlightingChange(!textHighlightingEnabled)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                textHighlightingEnabled ? 'bg-violet-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none absolute top-1 left-1 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  textHighlightingEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
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
              <p className="text-xs font-semibold leading-5 text-slate-400">Cambia esto solo cuando te haga falta.</p>
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

        <SectionCard title="Acciones" hint="Solo lo necesario">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[1rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,245,247,0.94))] px-4 py-3 text-sm font-extrabold text-rose-700 shadow-[0_18px_34px_-28px_rgba(244,114,182,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,242,246,0.96))] hover:shadow-[0_24px_38px_-30px_rgba(244,114,182,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100 active:translate-y-0 active:scale-[0.995]"
          >
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </SectionCard>
      </div>

      {identity.is_admin ? (
        <SectionCard
          title="Herramientas admin"
          hint="Gestion y mantenimiento solo cuando lo necesites"
        >
          <StatsDisclosure
            title="Gestion de alumnos"
            hint="La administracion queda contenida aqui, sin invadir la cuenta."
          >
            <div className="rounded-[1.25rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] p-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]">
              <Suspense
                fallback={
                  <div role="status" aria-live="polite" aria-busy="true" className="py-1">
                    <p className="ui-label mb-3">Cargando panel de administración</p>
                    <SkeletonText lines={3} />
                  </div>
                }
              >
                <AdminConsoleScreen />
              </Suspense>
            </div>
          </StatsDisclosure>
        </SectionCard>
      ) : null}
      </div>
    </div>
  );
};

export default DashboardProfileTab;
