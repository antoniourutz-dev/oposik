import React from 'react';
import { ArrowRight, DoorOpen, ListRestart, Shuffle, Target, UserRound } from 'lucide-react';
import type { AccountIdentity } from '../services/accountApi';
import type {
  PracticeProfile,
  PracticeQuestionScopeFilter,
  PracticeSessionSummary,
} from '../practiceTypes';
import type { MainTab } from './BottomDock';
import QuestionScopePicker from './QuestionScopePicker';

type GenericDashboardScreenProps = {
  activeTab: MainTab;
  identity: AccountIdentity;
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
        <section className="relative overflow-hidden rounded-[1.5rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-4 text-white shadow-[0_28px_60px_-34px_rgba(141,147,242,0.24)] sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/18 bg-white/12 backdrop-blur-[10px]">
              <UserRound size={22} />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-50/82">
                Cuenta
              </p>
              <p className="mt-1.5 text-[1.55rem] font-black leading-none text-white">
                {identity.current_username}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Sesiones" value={String(profile?.totalSessions ?? 0)} />
          <MiniMetric label="Ultimo" value={formatLastBlock(lastSession)} />
          <MiniMetric label="Fecha" value={formatLastStudy(profile?.lastStudiedAt)} />
        </section>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-extrabold text-slate-700 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd2f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99]"
        >
          <DoorOpen size={16} />
          Salir
        </button>
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
