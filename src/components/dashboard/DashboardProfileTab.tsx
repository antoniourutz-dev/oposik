import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { SkeletonText } from '../ui/skeleton';
import {
  Award,
  CalendarDays,
  Flame,
  LogOut,
  Shield,
  Target,
  UserRound,
} from 'lucide-react';
import type { DashboardContentProps } from './types';
import { SectionCard, StatsDisclosure, formatSessionDate, toDateInputValue } from './shared';

const AdminConsoleScreen = lazy(() => import('../AdminConsoleScreen'));

type Tone = 'violet' | 'amber' | 'sky';

const toneClassName: Record<Tone, string> = {
  violet:
    'border-violet-200/65 bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(237,233,254,0.82))] text-violet-950',
  amber:
    'border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.82))] text-amber-950',
  sky: 'border-sky-200/70 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(224,242,254,0.84))] text-sky-950',
};

const resolveStageLabel = (level: number, totalSessions: number) => {
  if (level >= 6) return 'Traccion consolidada';
  if (level >= 4) return 'Ritmo competitivo';
  if (level >= 2) return 'Base en construccion';
  return totalSessions > 0 ? 'Entrada en ritmo' : 'Punto de partida';
};

const resolveStageLine = (level: number, streakDays: number, totalAnswered: number) => {
  if (level >= 6) return 'Ya hay trayectoria: toca sostener precision y control.';
  if (streakDays >= 7) return 'La constancia reciente ya empuja tu preparacion.';
  if (totalAnswered >= 120) return 'La base trabajada empieza a tener volumen real.';
  return 'Estas dando forma a una identidad de estudio reconocible.';
};

const resolvePreparationMode = (playerMode: DashboardContentProps['identity']['player_mode']) =>
  playerMode === 'advanced' ? 'Preparacion avanzada' : 'Preparacion guiada';

const resolveExamCountdown = (daysToExam: number | null) => {
  if (daysToExam === null) return 'Sin fecha de examen';
  if (daysToExam === 0) return 'Examen hoy';
  if (daysToExam === 1) return '1 dia para el examen';
  return `${daysToExam} dias para el examen`;
};

const resolveIdentityMoment = ({
  daysToExam,
  streakDays,
  totalSessions,
  accuracyPct,
}: {
  daysToExam: number | null;
  streakDays: number;
  totalSessions: number;
  accuracyPct: number | null;
}) => {
  if (daysToExam !== null && daysToExam <= 30) {
    return 'Tramo decisivo: el sistema ya no es solo estudio, es ejecucion con control.';
  }
  if (streakDays >= 7) {
    return 'La constancia reciente ya tiene peso propio: estas dentro del ritmo, no buscandolo.';
  }
  if (accuracyPct !== null && accuracyPct >= 70 && totalSessions >= 6) {
    return 'Base y lectura empiezan a alinearse: ya hay una preparacion con forma.';
  }
  if (totalSessions >= 3) {
    return 'La preparacion ya ha arrancado: toca convertir continuidad en estatus.';
  }
  return 'Aqui se ve el inicio de la preparacion: identidad, ritmo y control en una misma ficha.';
};

const formatPercent = (value: number | null) => (value === null ? '--' : `${value}%`);

const ProfileStatTile = ({
  label,
  value,
  detail,
  tone = 'violet',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) => (
  <article
    className={`rounded-[1.2rem] border px-4 py-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] ${toneClassName[tone]}`}
  >
    <p className="ui-label text-current/65">{label}</p>
    <p className="mt-2 text-[1.55rem] font-black leading-none tracking-[-0.045em] text-current">
      {value}
    </p>
    <p className="mt-2 text-[0.92rem] font-semibold leading-[1.5] text-current/72">{detail}</p>
  </article>
);

const TrajectorySignalCard = ({
  eyebrow,
  title,
  detail,
  status,
  icon,
  tone = 'violet',
}: {
  eyebrow: string;
  title: string;
  detail: string;
  status: string;
  icon: React.ReactNode;
  tone?: Tone;
}) => (
  <article
    className={`rounded-[1.2rem] border px-4 py-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] ${toneClassName[tone]}`}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/55 bg-white/70 text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
        {icon}
      </span>
      <span className="rounded-full border border-current/10 bg-white/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-current/70">
        {status}
      </span>
    </div>
    <p className="ui-label mt-4 text-current/65">{eyebrow}</p>
    <p className="mt-1 text-[1.02rem] font-black leading-[1.24] tracking-[-0.02em] text-current">
      {title}
    </p>
    <p className="mt-2 text-[0.93rem] font-semibold leading-[1.56] text-current/74">{detail}</p>
  </article>
);

const DashboardProfileTab: React.FC<DashboardContentProps> = ({
  examTarget,
  examTargetError,
  activeLearningContext,
  onChangeLearningContext,
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

  const totalSessions = profile?.totalSessions ?? 0;
  const totalAnswered = profile?.totalAnswered ?? 0;
  const totalCorrect = profile?.totalCorrect ?? 0;
  const accuracyPct =
    totalAnswered > 0 ? Math.round((Math.max(0, totalCorrect) / totalAnswered) * 100) : null;
  const examDate = examTarget?.examDate ?? learningDashboard?.examDate ?? null;

  const daysToExam = useMemo(() => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(examDate);
    if (Number.isNaN(target.getTime())) return null;
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [examDate]);

  const levelProgressUnits = totalSessions > 0 ? totalSessions % 10 : 0;
  const levelProgressPct =
    totalSessions > 0 && levelProgressUnits === 0 ? 100 : Math.round((levelProgressUnits / 10) * 100);
  const sessionsToNextLevel =
    totalSessions > 0 && levelProgressUnits === 0 ? 0 : Math.max(0, 10 - levelProgressUnits);
  const stageLabel = resolveStageLabel(level, totalSessions);
  const stageLine = resolveStageLine(level, streakDays, totalAnswered);
  const preparationModeLabel = resolvePreparationMode(identity.player_mode);
  const identityMomentLine = resolveIdentityMoment({
    daysToExam,
    streakDays,
    totalSessions,
    accuracyPct,
  });
  const readinessLine =
    learningDashboard?.focusMessage?.trim() ||
    'Define fecha, carga y modo de lectura para que el sistema afine mejor tu preparacion.';
  const trainingStatusLabel = identity.is_admin
    ? 'Perfil con acceso interno'
    : 'Aspirante en preparacion';

  const trajectorySignals = useMemo(
    () => [
      {
        eyebrow: 'Constancia',
        title:
          streakDays >= 7
            ? 'Racha reconocible'
            : streakDays >= 3
              ? 'Continuidad abierta'
              : streakDays > 0
                ? 'Hilo de trabajo activo'
                : 'Constancia por activar',
        detail:
          streakDays > 0
            ? `${streakDays} dias cerrados seguidos dentro del sistema.`
            : 'Un cierre hoy vuelve a poner la preparacion en marcha.',
        status: streakDays >= 7 ? 'solida' : streakDays >= 3 ? 'creciendo' : 'temprana',
        icon: <Flame size={18} aria-hidden />,
        tone: 'amber' as const,
      },
      {
        eyebrow: 'Base trabajada',
        title:
          totalAnswered >= 180
            ? 'Volumen visible'
            : totalAnswered >= 60
              ? 'Base en expansion'
              : 'Base todavia corta',
        detail: `${totalAnswered} preguntas trabajadas en total dentro de tu preparacion.`,
        status: totalAnswered >= 180 ? 'amplia' : totalAnswered >= 60 ? 'real' : 'inicial',
        icon: <Target size={18} aria-hidden />,
        tone: 'sky' as const,
      },
      {
        eyebrow: 'Trayectoria',
        title:
          totalSessions >= 12
            ? 'Sesiones con peso'
            : totalSessions >= 4
              ? 'Ritmo reconocible'
              : 'Trayectoria en apertura',
        detail: `${totalSessions} sesiones cerradas; cada bloque ya deja rastro dentro del sistema.`,
        status: totalSessions >= 12 ? 'establecida' : totalSessions >= 4 ? 'visible' : 'arranque',
        icon: <Award size={18} aria-hidden />,
        tone: 'violet' as const,
      },
    ],
    [streakDays, totalAnswered, totalSessions],
  );

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
    <div className="mx-auto grid w-full max-w-4xl gap-4 pb-14 xl:max-w-6xl">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(162deg,rgba(15,23,42,0.98)_0%,rgba(30,27,75,0.97)_46%,rgba(49,46,129,0.95)_100%)] p-5 text-white shadow-[0_32px_72px_-34px_rgba(15,23,42,0.5)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_72%_at_0%_0%,rgba(255,255,255,0.09),transparent_46%)]" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-end">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-white/18 bg-white/12 text-[1.85rem] font-black text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:h-24 sm:w-24 sm:text-[2.1rem]">
                  {initials}
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-[1rem] border border-white/20 bg-amber-400 text-amber-950 shadow-[0_16px_28px_-20px_rgba(251,191,36,0.5)]">
                  <Award size={18} aria-hidden />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="ui-label-strong text-violet-200/84">Identidad dentro del sistema</p>
                <h1 className="mt-2 text-[2rem] font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-[2.4rem]">
                  {identity.current_username}
                </h1>
                <p className="mt-3 max-w-[38ch] text-[1rem] font-medium leading-[1.58] text-violet-100/86">
                  {identityMomentLine}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/88">
                    {trainingStatusLabel}
                  </span>
                  <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-violet-100/88">
                    {preparationModeLabel}
                  </span>
                  <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-violet-100/88">
                    {resolveExamCountdown(daysToExam)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="ui-label text-violet-200/78">Progresion simbolica</p>
                  <p className="mt-1 text-[0.98rem] font-semibold leading-[1.45] text-white/92">
                    {sessionsToNextLevel === 0
                      ? 'Nivel consolidado: ya has cerrado el tramo actual.'
                      : `${sessionsToNextLevel} sesiones mas para abrir el nivel ${level + 1}.`}
                  </p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-violet-100/82">
                  {levelProgressPct}%
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_22px_-14px_rgba(141,147,242,0.45)]"
                  style={{ width: `${Math.max(12, levelProgressPct)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/12 bg-white/10 px-5 py-5 backdrop-blur-sm shadow-[0_18px_40px_-28px_rgba(15,23,42,0.34)]">
            <p className="ui-label text-violet-200/78">Nivel actual</p>
            <p className="mt-2 text-[2.4rem] font-black leading-none tracking-[-0.06em] text-white">
              {String(level).padStart(2, '0')}
            </p>
            <p className="mt-2 text-[1.02rem] font-bold leading-[1.24] text-white">{stageLabel}</p>
            <p className="mt-2 text-[0.9rem] font-medium leading-[1.55] text-violet-100/78">
              {stageLine}
            </p>
          </div>
        </div>
      </section>

      <SectionCard
        title={activeLearningContext?.config.copyDictionary.profileTitle ?? 'Contexto activo'}
        hint={
          activeLearningContext?.config.copyDictionary.profileSummary ??
          'Este es el contexto que alimenta la practica, el estudio y las lecturas del sistema.'
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.25rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.94))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)]">
          <div className="min-w-0">
            <p className="ui-label text-slate-500">Contexto actual</p>
            <p className="mt-1 text-[1.08rem] font-black leading-[1.08] tracking-[-0.03em] text-slate-950">
              {activeLearningContext?.displayName ?? 'Sin contexto seleccionado'}
            </p>
            <p className="mt-2 text-[0.93rem] font-semibold leading-[1.52] text-slate-600">
              {activeLearningContext
                ? `Curriculum ${activeLearningContext.curriculumKey} · ${activeLearningContext.config.copyDictionary.workspaceSummary.toLowerCase()}`
                : 'Selecciona un contexto para activar el puente correcto de la app.'}
            </p>
          </div>

          {onChangeLearningContext ? (
            <button
              type="button"
              onClick={onChangeLearningContext}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-700"
            >
              {activeLearningContext?.config.copyDictionary.profileChangeCta ?? 'Cambiar'}
            </button>
          ) : null}
        </div>
      </SectionCard>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileStatTile
          label="Racha activa"
          value={streakDays > 0 ? `${streakDays} dias` : '0 dias'}
          detail={
            streakDays >= 7
              ? 'Constancia con peso real.'
              : streakDays >= 3
                ? 'Ritmo reciente abierto.'
                : 'La continuidad aun depende de hoy.'
          }
          tone="amber"
        />
        <ProfileStatTile
          label="Sesiones cerradas"
          value={String(totalSessions)}
          detail="Bloques ya completados dentro del sistema."
          tone="violet"
        />
        <ProfileStatTile
          label="Preguntas trabajadas"
          value={String(totalAnswered)}
          detail="Volumen total que ya ha pasado por tu preparacion."
          tone="sky"
        />
        <ProfileStatTile
          label="Precision acumulada"
          value={formatPercent(accuracyPct)}
          detail="Relacion entre aciertos y carga ya resuelta."
          tone="violet"
        />
      </section>

      <SectionCard
        title="Señales ya construidas"
        hint="No son adornos: resumen constancia, base trabajada y trayectoria dentro del sistema."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          {trajectorySignals.map((signal) => (
            <TrajectorySignalCard key={signal.eyebrow} {...signal} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Configuracion de entrenamiento"
        hint="Fecha, carga y lectura para modular el sistema segun tu preparacion real."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <form onSubmit={handleExamTargetSubmit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 sm:col-span-2">
                <span className="ui-label text-slate-500">Fecha objetivo</span>
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(event) => setExamDateInput(event.target.value)}
                  className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] outline-none transition focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="ui-label text-slate-500">Carga de repasos</span>
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
                <span className="ui-label text-slate-500">Carga de nuevas</span>
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

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
              <div className="min-w-0">
                <p className="ui-label text-slate-500">Ultimo ajuste</p>
                <p className="mt-1 text-[0.93rem] font-semibold leading-[1.5] text-slate-600">
                  {examTargetUpdatedLabel
                    ? `Entrenamiento actualizado ${examTargetUpdatedLabel}.`
                    : 'Ajusta este bloque solo cuando cambie tu calendario o tu ritmo.'}
                </p>
              </div>
              <button
                type="submit"
                disabled={savingExamTarget}
                className="inline-flex items-center justify-center rounded-[1rem] quantia-bg-gradient px-4 py-3 text-sm font-extrabold text-white shadow-[0_18px_30px_-24px_rgba(141,147,242,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_34px_-24px_rgba(141,147,242,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
              >
                {savingExamTarget ? 'Guardando...' : 'Guardar ritmo'}
              </button>
            </div>
          </form>

          <div className="grid gap-3">
            <div className="rounded-[1.2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="ui-label text-slate-500">Lectura de estudio</p>
                  <p className="mt-1 text-[1rem] font-black tracking-[-0.02em] text-slate-950">
                    Resaltado editorial
                  </p>
                  <p className="mt-2 text-[0.93rem] font-medium leading-[1.55] text-slate-600">
                    Activalo cuando quieras una lectura guiada; desactivalo si prefieres texto
                    limpio y concentracion plana.
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
            </div>

            <div className="rounded-[1.2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(241,247,255,0.92))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 text-white shadow-[0_16px_28px_-22px_rgba(15,23,42,0.35)]">
                  <Shield size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="ui-label text-slate-500">Foco del sistema</p>
                  <p className="mt-1 text-[0.97rem] font-semibold leading-[1.58] text-slate-700">
                    {readinessLine}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:ml-auto xl:w-full xl:max-w-[28rem]">
        <SectionCard
          title="Ajustes secundarios"
          hint="Acceso y salida, separados del bloque principal de preparacion."
        >
          <div className="grid gap-3">
            <div className="rounded-[1.1rem] border border-slate-200/70 bg-slate-50/85 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-slate-200/80 bg-white text-slate-700">
                  <UserRound size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="ui-label text-slate-500">Acceso</p>
                  <p className="mt-1 text-[0.97rem] font-semibold leading-[1.52] text-slate-700">
                    Tu salida de sesion queda aqui para no competir con identidad, progreso ni
                    configuracion de entrenamiento.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[1rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,245,247,0.94))] px-4 py-3 text-sm font-extrabold text-rose-700 shadow-[0_18px_34px_-28px_rgba(244,114,182,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,242,246,0.96))] hover:shadow-[0_24px_38px_-30px_rgba(244,114,182,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100 active:translate-y-0 active:scale-[0.995]"
            >
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        </SectionCard>
      </div>

      {identity.is_admin ? (
        <SectionCard
          title="Operacion interna"
          hint="Herramientas internas separadas del perfil de opositor."
          className="border-slate-200/80"
        >
          <StatsDisclosure
            title="Gestion de alumnos"
            hint="La operacion administrativa queda abajo, fuera de la narrativa principal de perfil."
          >
            <div className="rounded-[1.25rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] p-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]">
              <Suspense
                fallback={
                  <div role="status" aria-live="polite" aria-busy="true" className="py-1">
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
  );
};

export default DashboardProfileTab;
