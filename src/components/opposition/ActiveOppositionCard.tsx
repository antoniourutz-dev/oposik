import React from 'react';
import { BadgeCheck, ChevronRight, Columns3, Target } from 'lucide-react';
import type { OppositionOption } from '../../domain/oppositions/types';

type ActiveOppositionCardProps = {
  opposition: OppositionOption;
  selected?: boolean;
  onSelect: (oppositionId: string) => void;
  disabled?: boolean;
};

const ActiveOppositionCard: React.FC<ActiveOppositionCardProps> = ({
  opposition,
  selected = false,
  onSelect,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(opposition.id)}
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
            Oposicion activa
          </p>
          <h3 className="mt-1 text-[1.08rem] font-black leading-[1.1] tracking-[-0.03em] text-slate-950">
            {opposition.name}
          </h3>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
          {selected ? <BadgeCheck size={16} /> : <ChevronRight size={16} />}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
        {opposition.curriculumKey ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            <Columns3 size={12} />
            {opposition.curriculumKey}
          </span>
        ) : null}
        {opposition.code ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            <Target size={12} />
            {opposition.code}
          </span>
        ) : null}
      </div>
    </button>
  );
};

export default ActiveOppositionCard;
