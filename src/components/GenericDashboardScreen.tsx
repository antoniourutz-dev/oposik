import React from 'react';
import {
  ArrowRight,
  Award,
  DoorOpen,
  Flame,
  ListRestart,
  Shield,
  Shuffle,
  Target,
  UserRound,
} from 'lucide-react';
import type { AccountIdentity } from '../services/accountApi';
import type {
  PracticeProfile,
  PracticeQuestionScopeFilter,
  PracticeSessionSummary,
} from '../practiceTypes';
import type { MainTab } from './BottomDock';
import QuestionScopePicker from './QuestionScopePicker';
import type { ActiveLearningContext } from '../domain/learningContext/types';

type GenericDashboardScreenProps = {
  activeTab: MainTab;
  identity: AccountIdentity;
  activeLearningContext?: ActiveLearningContext | null;
  onChangeLearningContext?: () => void;
  catalogLoading?: boolean;
  profile: PracticeProfile | null;
  recentSessions: PracticeSessionSummary[];
  weakQuestionCount: number;
  questionScope: PracticeQuestionScopeFilter;
  onQuestionScopeChange: (questionScope: PracticeQuestionScopeFilter) => void;
  onStartSimple: () => void;
  onStartRandom: () => void;
  onStartWeakReview: () => void;
  onStartFromBeginning: () => void;
  onSignOut: () => void;
};

const formatLastBlock = (session: PracticeSessionSummary | null) => {
  if (!session) return '--';
  return `${session.score}/${session.total}`;
};

const formatLastStudy = (value: string | null | undefined) => {
  if (!value) return '--';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(parsed);
};

const MiniMetric: React.FC<{ label: string; value: string; caption?: string }> = ({
  label,
  value,
  caption,
}) => (
  <div className="rounded-[1.05rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1.5 text-[1.3rem] font-black leading-none text-slate-950">{value}</p>
    {caption ? <p className="mt-1 text-[11px] font-semibold text-slate-400">{caption}</p> : null}
  </div>
);

const ProfileMetric: React.FC<{
  label: string;
  value: string;
  detail: string;
  accent?: 'amber' | 'sky' | 'violet' | 'slate';
}> = ({ label, value, detail, accent = 'slate' }) => {
  const toneClassName =
    accent === 'amber'
      ? 'border-amber-200/75 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.82))] text-amber-950'
      : accent === 'sky'
        ? 'border-sky-200/75 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(224,242,254,0.82))] text-sky-950'
        : accent === 'violet'
          ? 'border-violet-200/75 bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(237,233,254,0.82))] text-violet-950'
          : 'border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] text-slate-950';

  return (
    <article
      className={`rounded-[1.2rem] border px-4 py-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.16)] ${toneClassName}`}
    >
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-current/68">
        {label}
      </p>
      <p className="mt-2 text-[1.55rem] font-black leading-none tracking-[-0.045em] text-current">
        {value}
      </p>
      <p className="mt-2 text-[0.94rem] font-semibold leading-[1.5] text-current/72">{detail}</p>
    </article>
  );
};

const TrajectoryCard: React.FC<{
  eyebrow: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
}> = ({ eyebrow, title, detail, icon }) => (
  <article className="rounded-[1.2rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-4 py-4 text-slate-950 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.16)]">
    <div className="flex items-start justify-between gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.16))] text-slate-700">
        {icon}
      </span>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        visible
      </span>
    </div>
    <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
      {eyebrow}
    </p>
    <p className="mt-1 text-[1.02rem] font-black leading-[1.24] tracking-[-0.02em] text-slate-950">
      {title}
    </p>
    <p className="mt-2 text-[0.94rem] font-semibold leading-[1.56] text-slate-600">{detail}</p>
  </article>
);

const ActionTile: React.FC<{
  title: string;
  meta?: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}> = ({ title, meta, icon, onClick, disabled = false, accent = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group flex min-h-[7.8rem] flex-col justify-between rounded-[1.2rem] border px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${
      accent
        ? 'border-[#c8d8fb] bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(236,244,255,0.95))] text-slate-950 shadow-[0_18px_34px_-24px_rgba(141,147,242,0.22)]'
        : 'border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] text-slate-950 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.18)]'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.16))] text-slate-700">
        {icon}
      </span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
        <ArrowRight
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </div>

    <div className="mt-3">
      <p className="text-[1rem] font-black leading-[1.08] text-slate-950">{title}</p>
      {meta ? (
        <p className="mt-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
          {meta}
        </p>
      ) : null}
    </div>
  </button>
);

const GenericDashboardScreen: React.FC<GenericDashboardScreenProps> = ({
  activeTab,
  identity,
  activeLearningContext = null,
  onChangeLearningContext,
  catalogLoading = false,
  profile,
  recentSessions,
  weakQuestionCount,
  questionScope,
  onQuestionScopeChange,
  onStartSimple,
  onStartRandom,
  onStartWeakReview,
  onStartFromBeginning,
  onSignOut,
}) => {
  const lastSession = recentSessions[0] ?? null;
  const canReviewWeakQuestions = weakQuestionCount > 0;
  const practiceLocked = catalogLoading;
  const initials = React.useMemo(() => {
    const parts = identity.current_username.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
  }, [identity.current_username]);
  const totalSessions = profile?.totalSessions ?? 0;
  const totalAnswered = profile?.totalAnswered ?? 0;
  const totalCorrect = profile?.totalCorrect ?? 0;
  const accuracyPct =
    totalAnswered > 0 ? Math.round((Math.max(0, totalCorrect) / totalAnswered) * 100) : null;
  const streakDays = React.useMemo(() => {
    const finishedKeys = new Set(
      recentSessions
        .map((session) => {
          const date = new Date(session.finishedAt);
          if (Number.isNaN(date.getTime())) return null;
          return date.toISOString().slice(0, 10);
        })
        .filter((value): value is string => Boolean(value)),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;

    for (;;) {
      const date = new Date(today);
      date.setDate(today.getDate() - streak);
      const key = date.toISOString().slice(0, 10);
      if (!finishedKeys.has(key)) break;
      streak += 1;
    }

    return streak;
  }, [recentSessions]);
  const level = Math.max(1, Math.round(totalSessions / 10) || 1);
  const levelProgressUnits = totalSessions > 0 ? totalSessions % 10 : 0;
  const levelProgressPct =
    totalSessions > 0 && levelProgressUnits === 0 ? 100 : Math.round((levelProgressUnits / 10) * 100);
  const progressWidth = Math.max(totalSessions > 0 ? levelProgressPct : 12, 12);
  const sessionsToNextLevel =
    totalSessions > 0 && levelProgressUnits === 0 ? 0 : Math.max(0, 10 - levelProgressUnits);
  const scopeLabel =
    questionScope === 'all'
      ? 'Temario completo'
      : questionScope === 'common'
        ? 'Temario comun'
        : 'Temario especifico';
  const stageLabel =
    level >= 4 ? 'Tramo firme' : level >= 2 ? 'Base activa' : totalSessions > 0 ? 'Ritmo abierto' : 'Punto de arranque';
  const statusLabel = totalSessions > 0 ? 'Aspirante en marcha' : 'Aspirante en apertura';
  const identityLine =
    streakDays >= 7
      ? 'La continuidad ya tiene peso propio: aqui no ves una cuenta, ves una preparacion sostenida.'
      : totalAnswered >= 120
        ? 'La base trabajada ya deja huella: volumen, lectura y control empiezan a alinearse.'
        : totalSessions >= 3
          ? 'Tu preparacion ya tiene forma: cada bloque cerrado suma identidad dentro del sistema.'
          : 'Esta ficha marca el arranque: identidad, ritmo y primeras senales de progreso.';
  const nextLevelLine =
    sessionsToNextLevel === 0
      ? 'Tramo consolidado: ya has completado el nivel actual.'
      : `${sessionsToNextLevel} sesiones mas para abrir el nivel ${level + 1}.`;
  const lastStudyLabel = formatLastStudy(profile?.lastStudiedAt);
  const modeLabel =
    identity.player_mode === 'advanced' ? 'Preparacion avanzada' : 'Preparacion guiada';

  if (activeTab === 'study') {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-0 py-3 sm:px-2 lg:px-4">
        <QuestionScopePicker
          value={questionScope}
          onChange={onQuestionScopeChange}
          label="Temario"
          compact
        />

        <section className="rounded-[1.5rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] px-4 py-4 text-white shadow-[0_28px_60px_-34px_rgba(141,147,242,0.24)] sm:px-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-50/82">
            Test
          </p>
          <h1 className="mt-2 text-[1.9rem] font-black leading-[0.94] tracking-[-0.05em] text-white">
            Elige y entra
          </h1>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <ActionTile
            title="Guiado"
            meta="20 preguntas"
            icon={<Target size={18} />}
            onClick={onStartSimple}
            accent
            disabled={practiceLocked}
          />
          <ActionTile
            title="Aleatorio"
            meta="20 preguntas"
            icon={<Shuffle size={18} />}
            onClick={onStartRandom}
            disabled={practiceLocked}
          />
          <ActionTile
            title="Falladas"
            meta={canReviewWeakQuestions ? `${weakQuestionCount} visibles` : 'sin fallos'}
            icon={<Target size={18} />}
            onClick={onStartWeakReview}
            disabled={practiceLocked || !canReviewWeakQuestions}
          />
          <ActionTile
            title="Inicio"
            meta="bloque 1"
            icon={<ListRestart size={18} />}
            onClick={onStartFromBeginning}
            disabled={practiceLocked}
          />
        </section>
      </div>
    );
  }

  if (activeTab === 'profile') {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-0 py-3 sm:px-2 lg:px-4">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-[linear-gradient(160deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.98)_42%,rgba(67,56,202,0.92)_100%)] p-4 text-white shadow-[0_30px_64px_-36px_rgba(15,23,42,0.48)] sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_72%_at_0%_0%,rgba(255,255,255,0.1),transparent_46%)]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute bottom-0 right-8 h-28 w-28 rounded-full bg-sky-300/10 blur-3xl" />

          <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_8.6rem] sm:items-end">
            <div className="min-w-0">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="flex h-18 w-18 items-center justify-center rounded-[1.5rem] border border-white/18 bg-white/12 text-[1.7rem] font-black text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:h-20 sm:w-20 sm:text-[1.9rem]">
                    {initials}
                  </div>
                  <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-[0.95rem] border border-white/20 bg-amber-300 text-amber-950 shadow-[0_16px_26px_-18px_rgba(251,191,36,0.52)]">
                    <Award size={16} aria-hidden />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sky-100/78">
                    Tu perfil dentro del sistema
                  </p>
                  <h1 className="mt-2 text-[1.95rem] font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-[2.2rem]">
                    {identity.current_username}
                  </h1>
                  <p className="mt-3 max-w-[36ch] text-[0.98rem] font-medium leading-[1.58] text-slate-100/86">
                    {identityLine}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/88">
                      {statusLabel}
                    </span>
                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-100/88">
                      {modeLabel}
                    </span>
                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-100/88">
                      {scopeLabel}
                    </span>
                  </div>
                </div>
              </div>

        <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sky-100/72">
                      Progresion simbolica
                    </p>
                    <p className="mt-1 text-[0.96rem] font-semibold leading-[1.48] text-white/92">
                      {nextLevelLine}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-100/84">
                    {levelProgressPct}%
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#79b6e9_0%,#8d93f2_100%)] shadow-[0_10px_20px_-14px_rgba(141,147,242,0.5)]"
                    style={{ width: `${progressWidth}%` }}
                  />
          </div>
        </div>

        <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sky-100/72">
                {activeLearningContext?.config.copyDictionary.profileTitle ?? 'Contexto activo'}
              </p>
              <p className="mt-1 text-[1rem] font-black leading-[1.12] text-white">
                {activeLearningContext?.displayName ?? 'Sin contexto seleccionado'}
              </p>
              <p className="mt-2 text-[0.9rem] font-medium leading-[1.52] text-slate-100/78">
                {activeLearningContext
                  ? `Curriculum ${activeLearningContext.curriculumKey} · ${activeLearningContext.config.copyDictionary.workspaceSummary.toLowerCase()}`
                  : 'Selecciona un contexto para activar el puente correcto de practica.'}
              </p>
            </div>
            {onChangeLearningContext ? (
              <button
                type="button"
                onClick={onChangeLearningContext}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/90"
              >
                {activeLearningContext?.config.copyDictionary.profileChangeCta ?? 'Cambiar'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

            <div className="rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-5 backdrop-blur-sm shadow-[0_18px_40px_-28px_rgba(15,23,42,0.34)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sky-100/72">
                Nivel actual
              </p>
              <p className="mt-2 text-[2.25rem] font-black leading-none tracking-[-0.06em] text-white">
                {String(level).padStart(2, '0')}
              </p>
              <p className="mt-2 text-[1rem] font-bold leading-[1.24] text-white">{stageLabel}</p>
              <p className="mt-2 text-[0.9rem] font-medium leading-[1.52] text-slate-100/78">
                {streakDays > 0
                  ? `${streakDays} dias seguidos sosteniendo el ritmo.`
                  : 'El siguiente cierre abre continuidad visible.'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ProfileMetric
            label="Racha activa"
            value={streakDays > 0 ? `${streakDays} dias` : '0 dias'}
            detail={
              streakDays >= 7
                ? 'Constancia con peso real.'
                : streakDays >= 3
                  ? 'Continuidad ya abierta.'
                  : 'La racha aun depende de hoy.'
            }
            accent="amber"
          />
          <ProfileMetric
            label="Sesiones cerradas"
            value={String(totalSessions)}
            detail="Cada bloque suma trayectoria dentro del sistema."
            accent="sky"
          />
          <ProfileMetric
            label="Precision"
            value={accuracyPct === null ? '--' : `${accuracyPct}%`}
            detail={
              accuracyPct !== null && accuracyPct >= 70
                ? 'Lectura y control en buena direccion.'
                : 'Todavia en fase de ajuste y lectura.'
            }
            accent="violet"
          />
          <ProfileMetric
            label="Banco de fallos"
            value={String(weakQuestionCount)}
            detail={
              canReviewWeakQuestions
                ? 'Preguntas listas para refuerzo.'
                : 'Sin bloque debil visible ahora mismo.'
            }
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
          <article className="rounded-[1.45rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,249,255,0.94))] p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Senales de progreso
                </p>
                <h2 className="mt-2 text-[1.35rem] font-black leading-[1.02] tracking-[-0.04em] text-slate-950">
                  Lo que ya has construido
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Perfil vivo
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <TrajectoryCard
                eyebrow="Constancia"
                title={
                  streakDays >= 7
                    ? 'Racha reconocible'
                    : streakDays >= 3
                      ? 'Continuidad en marcha'
                      : streakDays > 0
                        ? 'Hilo de trabajo abierto'
                        : 'Constancia por activar'
                }
                detail={
                  streakDays > 0
                    ? `${streakDays} dias seguidos cerrando trabajo dentro del sistema.`
                    : 'Un cierre hoy vuelve a poner la preparacion en marcha.'
                }
                icon={<Flame size={18} aria-hidden />}
              />
              <TrajectoryCard
                eyebrow="Base trabajada"
                title={
                  totalAnswered >= 120
                    ? 'Volumen visible'
                    : totalAnswered >= 40
                      ? 'Base en crecimiento'
                      : 'Base aun corta'
                }
                detail={`${totalAnswered} preguntas trabajadas ya forman parte de tu recorrido.`}
                icon={<Target size={18} aria-hidden />}
              />
              <TrajectoryCard
                eyebrow="Ultimo cierre"
                title={lastSession ? `Bloque ${formatLastBlock(lastSession)}` : 'Sin cierre reciente'}
                detail={
                  lastSession
                    ? 'La ultima sesion ya deja una referencia concreta de rendimiento.'
                    : 'Cuando cierres tu primer bloque, aparecera aqui la referencia del sistema.'
                }
                icon={<Shield size={18} aria-hidden />}
              />
            </div>
          </article>

          <div className="grid gap-3">
            <article className="rounded-[1.45rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,249,255,0.94))] p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] sm:p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Configuracion de entrenamiento
              </p>
              <h2 className="mt-2 text-[1.3rem] font-black leading-[1.04] tracking-[-0.04em] text-slate-950">
                Como se adapta el sistema a ti
              </h2>
              <p className="mt-3 text-[0.96rem] font-medium leading-[1.58] text-slate-600">
                Ajusta el alcance del temario y usa tu banco de fallos como parte activa de la preparacion.
              </p>

              <div className="mt-4 rounded-[1.2rem] border border-slate-200/85 bg-slate-50/85 p-3">
                <QuestionScopePicker
                  value={questionScope}
                  onChange={onQuestionScopeChange}
                  label="Foco del temario"
                  compact
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniMetric
                  label="Falladas"
                  value={String(weakQuestionCount)}
                  caption={canReviewWeakQuestions ? 'listas para revisar' : 'sin bloque pendiente'}
                />
                <MiniMetric label="Ultimo estudio" value={lastStudyLabel} />
              </div>
            </article>

            <article className="rounded-[1.45rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,249,255,0.94))] p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] sm:p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Ajustes secundarios
              </p>
              <h2 className="mt-2 text-[1.2rem] font-black leading-[1.06] tracking-[-0.035em] text-slate-950">
                Identidad de acceso
              </h2>

              <div className="mt-4 rounded-[1.2rem] border border-slate-200/85 bg-slate-50/88 px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[#d7e4fb] bg-white text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
                    <UserRound size={18} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Usuario activo
                    </p>
                    <p className="mt-1 text-[1rem] font-black leading-[1.15] text-slate-950">
                      {identity.current_username}
                    </p>
                    <p className="mt-2 text-[0.92rem] font-semibold leading-[1.5] text-slate-600">
                      {modeLabel}. Ultima actividad visible: {lastStudyLabel}.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="mt-4 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white/92 px-4 py-3 text-[0.96rem] font-extrabold tracking-[-0.01em] text-slate-700 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd2f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99]"
              >
                <DoorOpen size={16} />
                Cerrar sesion
              </button>
            </article>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-0 py-3 sm:px-2 lg:px-4">
      <QuestionScopePicker
        value={questionScope}
        onChange={onQuestionScopeChange}
        label="Temario"
        compact
      />

      <section className="relative overflow-hidden rounded-[1.6rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-4 text-white shadow-[0_28px_60px_-34px_rgba(141,147,242,0.24)] sm:p-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-white/14" />
          <div className="absolute right-10 top-14 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/86 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            Generico
          </div>

          <h1 className="mt-4 max-w-[16rem] text-[2rem] font-black leading-[0.94] tracking-[-0.05em] text-white sm:text-[2.4rem]">
            Empieza
          </h1>

          <button
            type="button"
            onClick={onStartSimple}
            className="mt-5 flex w-full items-center justify-between rounded-[1.35rem] border border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] p-4 text-left text-slate-950 shadow-[0_24px_42px_-28px_rgba(141,147,242,0.24)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:translate-y-0 active:scale-[0.99]"
          >
            <span>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Test de hoy
              </span>
              <span className="mt-1.5 block text-[1.35rem] font-black leading-none text-slate-950">
                20 preguntas
              </span>
              <span className="mt-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Guiado
              </span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c4d7fb] quantia-bg-gradient text-white">
              <ArrowRight size={17} />
            </span>
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Sesiones" value={String(profile?.totalSessions ?? 0)} />
        <MiniMetric label="Ultimo" value={formatLastBlock(lastSession)} />
        <MiniMetric label="Falladas" value={String(weakQuestionCount)} />
      </section>
    </div>
  );
};

export default GenericDashboardScreen;
