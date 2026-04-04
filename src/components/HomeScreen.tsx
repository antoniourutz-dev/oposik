import React from 'react';
import type { ActiveLearningContext } from '../domain/learningContext/types';

export type HomeModeId = 'mistakes' | 'random' | 'weak' | 'simulacro';

type HomeHeroViewModel = {
  contextKind: 'opposition' | 'general_law';
  eyebrow?: string;
  title: string;
  summary?: string;
  cta: string;
};

type HomeSecondaryOptionViewModel = {
  title: string;
  summary: string;
  cta: string;
};

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
  activeLearningContext?: ActiveLearningContext | null;
  /** Sin preguntas en el ámbito: desactiva acciones. */
  practiceLocked?: boolean;

  /** Card dominante: ya resuelta por adapter/contexto. */
  hero: HomeHeroViewModel;
  onPrimaryCta?: () => void;

  /** Card secundaria (sesión en curso): continuar/terminar. */
  onResumePracticeSession?: () => void;
  pausedSessionCtaLabel?: string;

  /** Una sola alternativa secundaria (misma ruta que antes: `onSelectMode`). */
  secondaryOption?: HomeSecondaryOptionViewModel | null;
  onSecondaryOptionCta?: () => void;

  /** Continuidad desde la última sesión cerrada (local, ~48h). */
  sessionContinuityHint?: string | null;
};

export default function HomeScreen({
  state = mockUserState,
  activeLearningContext = null,
  practiceLocked = false,
  hero,
  onPrimaryCta = () => {},
  onResumePracticeSession,
  pausedSessionCtaLabel = 'Continuar sesión',
  secondaryOption = null,
  onSecondaryOptionCta = () => {},
  sessionContinuityHint = null,
}: HomeScreenProps) {
  const interactiveDisabled = practiceLocked;
  const workspaceLabel =
    activeLearningContext?.config.copyDictionary.workspaceLabel ??
    (hero.contextKind === 'general_law' ? 'Aprender leyes' : 'Preparar oposicion');
  const workspaceName = activeLearningContext?.displayName?.trim() || null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6 sm:max-w-xl sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="ui-label text-slate-400">{workspaceLabel}</p>
          {workspaceName ? (
            <p className="mt-1 text-[0.98rem] font-extrabold tracking-[-0.02em] text-slate-800">
              {workspaceName}
            </p>
          ) : null}
        </div>
      </div>

      {sessionContinuityHint ? (
        <div className="mt-4 rounded-[1.1rem] border border-violet-200/70 bg-violet-50/60 px-3.5 py-2.5 text-[12px] font-medium leading-[1.5] text-slate-700 shadow-sm">
          <span className="font-bold text-violet-900">Continuidad · </span>
          {sessionContinuityHint}
        </div>
      ) : null}

      <div className={sessionContinuityHint ? 'mt-4' : 'mt-5'}>
        <CoachHeroCard
          hero={hero}
          disabled={interactiveDisabled}
          onCta={() => {
            if (interactiveDisabled) return;
            onPrimaryCta();
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
              onSecondaryOptionCta();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function CoachHeroCard({
  hero,
  disabled,
  onCta,
}: {
  hero: HomeHeroViewModel;
  disabled: boolean;
  onCta: () => void;
}) {
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
        <p className="ui-label-strong text-violet-300/95">{hero.eyebrow ?? 'Recomendacion principal'}</p>

        <h2
          id="home-coach-hero-title"
          className="ui-display-hero mt-5 max-w-[17ch] text-balance text-white sm:mt-6 sm:max-w-[19ch]"
        >
          {hero.title}
        </h2>

        {hero.summary ? (
          <p className="ui-body-main mt-6 max-w-[34ch] text-violet-100/[0.82]">
            {hero.summary}
          </p>
        ) : null}

        <div className="mt-10 sm:mt-11">
          <button
            type="button"
            disabled={disabled}
            onClick={onCta}
            className="ui-button-text relative w-full overflow-hidden rounded-[1.25rem] bg-white py-[1.24rem] text-center text-[#1e1b4b] shadow-[0_16px_48px_-10px_rgba(0,0,0,0.55),inset_0_2px_0_rgba(255,255,255,0.95)] ring-[3px] ring-white/30 transition-[transform,box-shadow,filter] duration-200 ease-out hover:brightness-[1.04] hover:ring-white/55 active:scale-[0.982] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#1e153f] sm:rounded-[1.4rem] sm:py-[1.28rem]"
          >
            <span className="relative z-[1]">{hero.cta}</span>
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
        <p className="ui-label text-slate-400/95">Alternativa</p>
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
