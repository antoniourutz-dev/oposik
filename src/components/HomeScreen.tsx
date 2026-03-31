import React, { useMemo } from 'react';
import { ArrowRight, Flame, HelpCircle, History, Shuffle, Sparkles, Timer } from 'lucide-react';
import type { CoachTwoLineMessage } from '../domain/learningEngine';

export type HomeModeId = 'mistakes' | 'random' | 'weak' | 'simulacro';

export type UserState = {
  name: string;
  streakDays: number;

  hasActiveSession: boolean;
  remainingQuestions: number;
  sessionProgress: number; // 0-100

  mistakesPending: number;
  weakTopicsCount: number;

  recentAccuracyTrend: 'up' | 'down' | 'stable';
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const toPct = (n: number) => `${Math.round(clamp01(n / 100) * 100)}%`;

const mockUserState: UserState = {
  name: 'Alex',
  streakDays: 5,
  hasActiveSession: true,
  remainingQuestions: 3,
  sessionProgress: 88,
  mistakesPending: 12,
  weakTopicsCount: 4,
  recentAccuracyTrend: 'stable',
};

type HomeScreenProps = {
  state?: UserState;
  /** Sin preguntas en el ámbito: desactiva acciones. */
  practiceLocked?: boolean;

  /** Card dominante (coach): no tocar lógica, solo presentar copy existente. */
  coachMessage?: CoachTwoLineMessage | null;
  coachCtaLabel?: string;
  onCoachCta?: () => void;

  /** Card secundaria (sesión en curso): continuar/terminar. */
  onResumePracticeSession?: () => void;

  /** Grid de modos (referencia visual 2×2). */
  modesSectionLabel?: string;
  onSelectMode?: (mode: HomeModeId) => void;
};

export default function HomeScreen({
  state = mockUserState,
  practiceLocked = false,
  coachMessage = null,
  coachCtaLabel = 'Empezar ahora',
  onCoachCta = () => {},
  onResumePracticeSession,
  modesSectionLabel = 'Si no, prueba esto',
  onSelectMode = () => {},
}: HomeScreenProps) {
  const interactiveDisabled = practiceLocked;

  const modeHighlight = useMemo((): HomeModeId => {
    if (state.mistakesPending > 0) return 'mistakes';
    if (state.weakTopicsCount > 0) return 'weak';
    return 'random';
  }, [state.mistakesPending, state.weakTopicsCount]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6 sm:max-w-xl sm:px-6">
      <Header name={state.name} streakDays={state.streakDays} />

      <div className="mt-7">
        <CoachHeroCard
          message={coachMessage}
          ctaLabel={coachCtaLabel}
          disabled={interactiveDisabled}
          onCta={() => {
            if (interactiveDisabled) return;
            onCoachCta();
          }}
        />
      </div>

      {state.hasActiveSession ? (
        <div className="mt-5">
          <SessionProgressCard
            remainingQuestions={state.remainingQuestions}
            progress={state.sessionProgress}
            disabled={interactiveDisabled}
            onCta={() => {
              if (interactiveDisabled) return;
              onResumePracticeSession?.();
            }}
          />
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-slate-900">{modesSectionLabel}</h2>
        <div className="mt-4">
          <ModesGrid
            mistakesPending={state.mistakesPending}
            weakTopicsCount={state.weakTopicsCount}
            highlightId={modeHighlight}
            disabled={interactiveDisabled}
            onSelectMode={onSelectMode}
          />
        </div>
      </div>
    </div>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function Header({ name, streakDays }: { name: string; streakDays: number }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 text-[13px] font-bold tracking-tight text-white shadow-[0_10px_28px_-10px_rgba(91,33,182,0.55)] ring-2 ring-white/90"
          aria-hidden="true"
        >
          {initialsFromName(name)}
        </span>
        <p className="truncate text-[1.05rem] font-bold leading-tight tracking-[-0.03em] text-slate-950">{`Hola, ${name}`}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-50/90 px-3.5 py-2 text-[12px] font-semibold tabular-nums tracking-tight text-amber-950 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_20px_-12px_rgba(217,119,6,0.35)]">
        <Flame size={15} className="text-orange-500" strokeWidth={2.25} aria-hidden="true" />
        {streakDays} días
      </span>
    </header>
  );
}

function CoachHeroCard({
  message,
  ctaLabel,
  disabled,
  onCta,
}: {
  message: CoachTwoLineMessage | null;
  ctaLabel: string;
  disabled: boolean;
  onCta: () => void;
}) {
  const line1 = message?.line1?.trim() || 'Hoy toca una decisión clara.';
  const line2 = message?.line2?.trim() || 'Haz una sesión corta y con intención.';

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(152deg,#3b0764_0%,#5b21b6_38%,#7c3aed_68%,#a78bfa_100%)] p-7 text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_28px_64px_-28px_rgba(76,29,149,0.55),0_48px_100px_-48px_rgba(49,46,129,0.35)] sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_90%_-20%,rgba(255,255,255,0.18),transparent_50%),radial-gradient(ellipse_80%_60%_at_0%_100%,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/95 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset] backdrop-blur-sm">
          <Sparkles size={13} className="text-amber-200/95" aria-hidden="true" />
          Hoy toca esto
        </span>

        <h1 className="mt-5 text-[1.65rem] font-bold leading-[1.12] tracking-[-0.045em] text-white drop-shadow-sm sm:text-[1.85rem]">
          {line1}
        </h1>
        <p className="mt-3 text-[0.95rem] font-medium leading-relaxed text-white/[0.92]">{line2}</p>

        <div className="mt-7">
          <button
            type="button"
            disabled={disabled}
            onClick={onCta}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-50 px-6 text-[0.95rem] font-bold tracking-[-0.02em] text-violet-800 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_14px_32px_-12px_rgba(15,23,42,0.35)] transition-[transform,box-shadow] duration-200 ease-out hover:shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_18px_40px_-10px_rgba(15,23,42,0.28)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-900"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function SessionProgressCard({
  remainingQuestions,
  progress,
  disabled,
  onCta,
}: {
  remainingQuestions: number;
  progress: number;
  disabled: boolean;
  onCta: () => void;
}) {
  return (
    <section className="rounded-[1.35rem] border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)_inset,0_16px_40px_-28px_rgba(15,23,42,0.14)] sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Continuar sesión</p>
      <p className="mt-2 text-[1.1rem] font-bold leading-snug tracking-[-0.03em] text-slate-950">
        {`Te quedan ${remainingQuestions} preguntas`}
      </p>
      <div className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 ring-1 ring-slate-900/[0.04]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
          style={{ width: toPct(progress) }}
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onCta}
        className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center rounded-full border border-slate-200/90 bg-white px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
      >
        Terminar ahora
      </button>
    </section>
  );
}

function ModeTile({
  title,
  subtitle,
  badge,
  badgeVariant = 'accent',
  highlighted,
  icon,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge: string | null;
  badgeVariant?: 'accent' | 'muted';
  highlighted: boolean;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex min-h-[132px] w-full flex-col rounded-[1.35rem] border p-[0.95rem] text-left transition-[transform,box-shadow,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 ${
        highlighted
          ? 'border-violet-300/50 bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_28px_-8px_rgba(91,33,182,0.12),0_24px_48px_-20px_rgba(91,33,182,0.14)] ring-1 ring-violet-500/10 hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_16px_36px_-10px_rgba(91,33,182,0.16)]'
          : 'border-slate-200/60 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)_inset,0_10px_28px_-12px_rgba(15,23,42,0.08)] hover:-translate-y-px hover:border-slate-300/70 hover:shadow-[0_1px_0_rgba(15,23,42,0.04)_inset,0_14px_36px_-12px_rgba(15,23,42,0.12)] active:translate-y-0'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            highlighted
              ? 'bg-gradient-to-b from-violet-50 to-violet-100/90 text-violet-700 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]'
              : 'bg-slate-100/90 text-slate-700 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]'
          }`}
        >
          {icon}
        </span>
        {badge ? (
          <span
            className={`max-w-[min(100%,7.5rem)] shrink-0 truncate rounded-lg px-2 py-1 text-[8.5px] font-bold uppercase leading-none tracking-[0.12em] shadow-sm ${
              badgeVariant === 'accent'
                ? 'border border-violet-700/20 bg-gradient-to-b from-violet-600 to-violet-700 text-white'
                : 'border border-slate-200/80 bg-slate-100/90 text-slate-600'
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3.5 text-[0.95rem] font-bold leading-tight tracking-[-0.025em] text-slate-950">{title}</p>
      <p className="mt-1.5 text-[0.78rem] font-medium leading-snug text-slate-500">{subtitle}</p>
      <ArrowRight
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute bottom-3.5 right-3.5 text-slate-300/90 opacity-80 transition-[transform,opacity] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden="true"
      />
    </button>
  );
}

function ModesGrid({
  mistakesPending,
  weakTopicsCount,
  highlightId,
  disabled,
  onSelectMode,
}: {
  mistakesPending: number;
  weakTopicsCount: number;
  highlightId: HomeModeId;
  disabled: boolean;
  onSelectMode: (mode: HomeModeId) => void;
}) {
  const mistakesBadge = mistakesPending > 0 ? `${mistakesPending} pendientes` : null;
  const weakBadge = weakTopicsCount > 0 ? `${weakTopicsCount} temas` : null;

  return (
    <div
      className="rounded-[1.75rem] border border-slate-200/35 bg-gradient-to-b from-white/80 to-slate-50/40 p-3 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] backdrop-blur-[2px] sm:p-3.5"
      aria-label="Modos de práctica"
    >
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      <ModeTile
        title="Falladas"
        subtitle="Repasa tus errores"
        badge={mistakesBadge}
        badgeVariant="accent"
        highlighted={highlightId === 'mistakes'}
        icon={<History size={20} strokeWidth={2} aria-hidden="true" />}
        disabled={disabled}
        onClick={() => onSelectMode('mistakes')}
      />
      <ModeTile
        title="Aleatoria"
        subtitle="Preguntas variadas"
        badge={null}
        highlighted={highlightId === 'random'}
        icon={<Shuffle size={20} strokeWidth={2} aria-hidden="true" />}
        disabled={disabled}
        onClick={() => onSelectMode('random')}
      />
      <ModeTile
        title="Zonas débiles"
        subtitle="Refuerza tus temas flojos"
        badge={weakBadge}
        badgeVariant="muted"
        highlighted={highlightId === 'weak'}
        icon={<HelpCircle size={20} strokeWidth={2} aria-hidden="true" />}
        disabled={disabled}
        onClick={() => onSelectMode('weak')}
      />
      <ModeTile
        title="Simulacro"
        subtitle="Entrena bajo presión"
        badge={null}
        highlighted={false}
        icon={<Timer size={20} strokeWidth={2} aria-hidden="true" />}
        disabled={disabled}
        onClick={() => onSelectMode('simulacro')}
      />
      </div>
    </div>
  );
}
