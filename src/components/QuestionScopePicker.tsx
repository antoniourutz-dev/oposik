import React from 'react';
import { PracticeQuestionScopeFilter } from '../practiceTypes';
import { getQuestionScopeLabel } from '../utils/practiceQuestionScope';

type QuestionScopePickerProps = {
  value: PracticeQuestionScopeFilter;
  onChange: (value: PracticeQuestionScopeFilter) => void;
  label?: string;
  compact?: boolean;
};

const scopeOptions: PracticeQuestionScopeFilter[] = ['all', 'common', 'specific'];

const QuestionScopePicker: React.FC<QuestionScopePickerProps> = ({
  value,
  onChange,
  label = 'Temario',
  compact = false
}) => (
  <div className={compact ? 'grid gap-2' : 'grid gap-2.5'}>
    <p id={`scope-label-${label}`} className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
      {label}
    </p>
    <div
      role="group"
      aria-labelledby={`scope-label-${label}`}
      className="inline-flex w-fit flex-nowrap rounded-full border border-[#d7e4fb] bg-white/92 p-1 shadow-[0_14px_24px_-22px_rgba(141,147,242,0.18)]"
    >
      {scopeOptions.map((option) => {
        const isActive = value === option;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive ? 'true' : 'false'}
            onClick={() => onChange(option)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 ${
              isActive
                ? 'quantia-bg-gradient text-white shadow-[0_12px_22px_-16px_rgba(141,147,242,0.3)]'
                : 'text-slate-500 hover:bg-sky-50/80'
            } ${compact ? 'min-w-[5.6rem]' : 'min-w-[6.1rem]'}`}
          >
            {getQuestionScopeLabel(option)}
          </button>
        );
      })}
    </div>
  </div>
);

export default QuestionScopePicker;
