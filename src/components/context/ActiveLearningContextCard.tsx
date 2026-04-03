import React from 'react';
import {
  BadgeCheck,
  BookOpenText,
  ChevronRight,
  Columns3,
  Flag,
  Scale,
  Target,
} from 'lucide-react';
import type { LearningContextOption } from '../../domain/learningContext/types';

type ActiveLearningContextCardProps = {
  context: LearningContextOption;
  selected?: boolean;
  onSelect: (context: LearningContextOption) => void;
  disabled?: boolean;
};

const ActiveLearningContextCard: React.FC<ActiveLearningContextCardProps> = ({
  context,
  selected = false,
  onSelect,
  disabled = false,
}) => {
  const eyebrow =
    context.contextType === 'general_law'
      ? context.config.copyDictionary.workspaceLabel
      : 'Preparar oposicion';
  const leadingIcon =
    context.contextType === 'general_law' ? <Scale size={16} /> : <Target size={16} />;

  return (
    <button
      type="button"
      onClick={() => onSelect(context)}
      disabled={disabled}
      className={`group flex w-full flex-col gap-3 rounded-[1.4rem] border px-4 py-4 text-left shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? 'border-violet-200 bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(237,233,254,0.84))]'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-[1.08rem] font-black leading-[1.1] tracking-[-0.03em] text-slate-950">
            {context.displayName}
          </h3>
          <p className="mt-2 text-[0.93rem] font-semibold leading-[1.52] text-slate-600">
            {context.description}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
          {selected ? <BadgeCheck size={16} /> : <ChevronRight size={16} />}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
          {leadingIcon}
          {context.contextType === 'general_law' ? 'Workspace legal' : 'Motor unico'}
        </span>
        {context.curriculumKey ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            <Columns3 size={12} />
            {context.curriculumKey}
          </span>
        ) : null}
        {context.code ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            {context.contextType === 'general_law' ? <BookOpenText size={12} /> : <Flag size={12} />}
            {context.code}
          </span>
        ) : null}
      </div>
    </button>
  );
};

export default ActiveLearningContextCard;
