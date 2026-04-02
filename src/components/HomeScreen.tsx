import React from 'react';
import type { CoachTwoLineMessage } from '../domain/learningEngine';

/**
 * Presentación del hero: solo reordena / recorta el copy ya emitido por `buildCoachTwoLineMessageV2`
 * (claves = pares exactos line1+line2). Sin adapters ni motor.
 */
type CoachHeroPresentation = {
  eyebrow: string;
  headline: string;
  sub: string;
};

function coachHeroPresentation(message: CoachTwoLineMessage | null): CoachHeroPresentation {
  const l1 = message?.line1?.trim() ?? '';
  const l2 = message?.line2?.trim() ?? '';
  const key = `${l1}\n${l2}`;

  const fallback: CoachHeroPresentation = {
    eyebrow: 'Recomendación principal',
    headline: l1 || 'Tienes preguntas vencidas',
    sub: l2 || 'Hoy va mejor mezclar y consolidar tus conocimientos.',
  };

  const byExactPair: Record<string, CoachHeroPresentation> = {
    'Tienes preguntas vencidas\nHoy va mejor consolidar antes de seguir.': {
      eyebrow: 'Antes de seguir',
      headline: 'Consolidar antes de seguir',
      sub: 'Tienes preguntas vencidas.',
    },
    'Estás repitiendo errores\nCorrige el patrón antes de avanzar.': {
      eyebrow: 'Antes de avanzar',
      headline: 'Corrige el patrón',
      sub: 'Estás repitiendo errores.',
    },
    'Hoy toca entrenar examen\nTu nivel cae cuando sube la presión.': {
      eyebrow: 'Tu nivel cae',
      headline: 'Entrenar examen',
      sub: 'Cuando sube la presión.',
    },
    'Vuelve a entrar fácil\nUna sesión corta hoy ya cambia la dinámica.': {
      eyebrow: 'Sesión corta',
      headline: 'Vuelve a entrar fácil',
      sub: 'Una sesión corta hoy ya cambia la dinámica.',
    },
    'Estás listo para subir\nTu base aguanta; hoy puedes exigir más.': {
      eyebrow: 'Tu base aguanta',
      headline: 'Estás listo para subir',
      sub: 'Hoy puedes exigir más.',
    },
    'Hoy toca afinar\nVamos a lo seguro para fijar lo importante.': {
      eyebrow: 'Fijar lo importante',
      headline: 'Hoy toca afinar',
      sub: 'Vamos a lo seguro para fijar lo importante.',
    },
    'Hoy toca afinar\nVamos a lo seguro para generar señal.': {
      eyebrow: 'Generar señal',
      headline: 'Hoy toca afinar',
      sub: 'Vamos a lo seguro para generar señal.',
    },
  };

  return byExactPair[key] ?? fallback;
}

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
  pausedSessionCtaLabel?: string;

  /** Una sola alternativa secundaria (misma ruta que antes: `onSelectMode`). */
  secondaryOption?: {
    mode: HomeModeId;
    title: string;
    summary: string;
    cta: string;
  } | null;

  /** Continuidad desde la última sesión cerrada (local, ~48h). */
  sessionContinuityHint?: string | null;

  onSelectMode?: (mode: HomeModeId) => void;
};

export default function HomeScreen({
  state = mockUserState,
  practiceLocked = false,
  coachMessage = null,
  coachCtaLabel = 'Empezar ahora',
  onCoachCta = () => {},
  onResumePracticeSession,
  pausedSessionCtaLabel = 'Continuar sesión',
  secondaryOption = null,
  sessionContinuityHint = null,
  onSelectMode = () => {},
}: HomeScreenProps) {
  const interactiveDisabled = practiceLocked;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6 sm:max-w-xl sm:px-6">
      {/* El header global (avatar + racha) vive en `TopBar` */}

      {sessionContinuityHint ? (
        <div className="mt-4 rounded-[1.1rem] border border-violet-200/70 bg-violet-50/60 px-3.5 py-2.5 text-[12px] font-medium leading-[1.5] text-slate-700 shadow-sm">
          <span className="font-bold text-violet-900">Continuidad · </span>
          {sessionContinuityHint}
        </div>
      ) : null}

      <div className={sessionContinuityHint ? 'mt-4' : 'mt-5'}>
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
        <div className="mt-4">
          <SessionProgressCard
            remainingQuestions={state.remainingQuestions}
            progress={state.sessionProgress}
            ctaLabel={pausedSessionCtaLabel}
            disabled={interactiveDisabled}
            onCta={() => {
              if (interactiveDisabled) return;
              onResumePracticeSession?.();
            }}
          />
        </div>
      ) : null}

      {secondaryOption ? (
        <div className="mt-4">
          <SecondaryOptionCard
            title={secondaryOption.title}
            summary={secondaryOption.summary}
            cta={secondaryOption.cta}
            disabled={interactiveDisabled}
            onCta={() => {
              if (interactiveDisabled) return;
              onSelectMode(secondaryOption.mode);
            }}
          />
        </div>
      ) : null}
    </div>
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
  const { eyebrow, headline, sub } = coachHeroPresentation(message);

  return (
    <section
      aria-labelledby="home-coach-hero-title"
      className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.12] bg-[linear-gradient(158deg,#160b35_0%,#251c5c_38%,#312e81_72%,#3730a3_100%)] px-7 pb-10 pt-10 text-white shadow-[0_48px_100px_-36px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.09)] sm:rounded-[2.25rem] sm:px-10 sm:pb-11 sm:pt-11"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_85%_at_12%_-15%,rgba(255,255,255,0.16),transparent_50%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_55%_at_100%_105%,rgba(0,0,0,0.35),transparent_52%)]"
        aria-hidden="true"
      />

      <div className="relative flex flex-col">
        <p className="ui-label-strong text-violet-300/95">{eyebrow}</p>

        <h2
          id="home-coach-hero-title"
          className="ui-display-hero mt-5 max-w-[17ch] text-balance text-white sm:mt-6 sm:max-w-[19ch]"
        >
          {headline}
        </h2>

        <p className="ui-body-main mt-6 max-w-[34ch] text-violet-100/[0.82]">
          {sub}
        </p>

        <div className="mt-10 sm:mt-11">
          <button
            type="button"
            disabled={disabled}
            onClick={onCta}
            className="ui-button-text relative w-full overflow-hidden rounded-[1.25rem] bg-white py-[1.24rem] text-center text-[#1e1b4b] shadow-[0_16px_48px_-10px_rgba(0,0,0,0.55),inset_0_2px_0_rgba(255,255,255,0.95)] ring-[3px] ring-white/30 transition-[transform,box-shadow,filter] duration-200 ease-out hover:brightness-[1.04] hover:ring-white/55 active:scale-[0.982] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#1e153f] sm:rounded-[1.4rem] sm:py-[1.28rem]"
          >
            <span className="relative z-[1]">{ctaLabel}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function SessionProgressCard({
  remainingQuestions,
  progress,
  ctaLabel,
  disabled,
  onCta,
}: {
  remainingQuestions: number;
  progress: number;
  ctaLabel: string;
  disabled: boolean;
  onCta: () => void;
}) {
  return (
    <section className="rounded-[1.25rem] border border-slate-200/60 bg-slate-50/80 p-4 shadow-sm sm:p-5">
      <p className="ui-label text-slate-500">Continuar sesión</p>
      <p className="ui-heading-secondary mt-2 text-slate-950">
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
        className="ui-button-label mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-slate-200/90 bg-white px-5 text-slate-800 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
      >
        {ctaLabel}
      </button>
    </section>
  );
}

function SecondaryOptionCard({
  title,
  summary,
  cta,
  disabled,
  onCta,
}: {
  title: string;
  summary: string;
  cta: string;
  disabled: boolean;
  onCta: () => void;
}) {
  return (
    <section className="rounded-[1rem] border border-dashed border-slate-200/80 bg-transparent px-0.5 py-0.5">
      <div className="rounded-[0.9rem] border border-slate-100/95 bg-white/65 px-3 py-2.5 sm:px-3.5 sm:py-2.5">
        <p className="ui-label text-slate-400/95">Plan B</p>
        <p className="ui-heading-secondary mt-1 text-slate-800">{title}</p>
        <p className="ui-body-secondary mt-1 text-slate-500">{summary}</p>
        <button
          type="button"
          disabled={disabled}
          onClick={onCta}
          className="ui-button-label mt-2 inline-flex min-h-[36px] w-full items-center justify-center rounded-full border border-slate-200/85 bg-slate-50/95 px-3 text-slate-600 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35"
        >
          {cta}
        </button>
      </div>
    </section>
  );
}
