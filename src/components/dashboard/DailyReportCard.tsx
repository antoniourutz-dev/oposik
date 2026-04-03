import React from 'react';
import type { DailyReport } from '../../domain/dailyReport/types';

const BADGE_CLASS: Record<DailyReport['primaryInsight']['badge'], string> = {
  estable: 'border-slate-200 bg-slate-50 text-slate-600',
  alerta: 'border-amber-200/90 bg-amber-50/90 text-amber-900',
  progreso: 'border-emerald-200/90 bg-emerald-50/90 text-emerald-900',
  recuperación: 'border-sky-200/90 bg-sky-50/90 text-sky-900',
};

const BADGE_LABEL: Record<DailyReport['primaryInsight']['badge'], string> = {
  estable: 'Estable',
  alerta: 'Atención',
  progreso: 'Progreso',
  recuperación: 'Recuperación',
};

function capitalizeEs(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type DailyReportCardProps = {
  report: DailyReport;
};

/**
 * Informe interpretativo de un día: una sola superficie, insight dominante, métricas compactas.
 */
export const DailyReportCard: React.FC<DailyReportCardProps> = ({ report }) => {
  const accPct =
    report.questionsSeen > 0
      ? Math.round((report.correctAnswers / report.questionsSeen) * 100)
      : 0;

  return (
    <div className="mt-5 rounded-[1.35rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.18)] sm:p-6">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Informe del día</p>
      <h4 className="mt-2 text-[1.15rem] font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-[1.25rem]">
        {capitalizeEs(report.weekdayTitle)}
      </h4>
      <p className="mt-1 text-[13px] font-semibold text-slate-500">{report.subtitle}</p>

      {/* Insight principal — centro de gravedad */}
      <div className="mt-6 rounded-[1.1rem] border border-violet-200/60 bg-violet-50/50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] ${BADGE_CLASS[report.primaryInsight.badge]}`}
          >
            {BADGE_LABEL[report.primaryInsight.badge]}
          </span>
        </div>
        <p className="mt-3 text-[1.02rem] font-black leading-snug tracking-[-0.02em] text-slate-900 sm:text-[1.06rem]">
          {report.primaryInsight.title}
        </p>
        <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate-600">{report.primaryInsight.summary}</p>
      </div>

      {/* Cuatro métricas compactas */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Preguntas vistas', value: String(report.questionsSeen) },
          { label: 'Aciertos', value: String(report.correctAnswers) },
          { label: 'Precisión', value: `${accPct}%` },
          { label: 'Tiempo medio', value: `${report.avgResponseSeconds} s` },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-100/90 bg-white/80 px-3 py-3 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{m.label}</p>
            <p className="mt-1.5 text-lg font-black tabular-nums text-slate-900 sm:text-xl">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Dos bloques secundarios */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white/90 px-4 py-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Foco de contenido</p>
          <p className="mt-2 text-[11px] font-semibold text-slate-500">Más trabajado</p>
          <p className="mt-0.5 text-[13px] font-bold leading-snug text-slate-800">{report.mostWorkedLabel}</p>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">Más fallos</p>
          <p className="mt-0.5 text-[13px] font-bold leading-snug text-slate-800">{report.weakestLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white/90 px-4 py-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Composición</p>
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-slate-700">{report.compositionNote}</p>
        </div>
      </div>

      <p className="mt-6 border-t border-slate-100 pt-4 text-[13px] font-semibold leading-relaxed text-slate-500">
        {report.closingNote}
      </p>
    </div>
  );
};

type DailyReportEmptyProps = {
  dateLabel: string;
};

export const DailyReportEmpty: React.FC<DailyReportEmptyProps> = ({ dateLabel }) => (
  <div className="mt-5 rounded-[1.35rem] border border-dashed border-slate-200/90 bg-slate-50/50 px-5 py-6 text-center sm:px-6">
    <p className="text-[11px] font-semibold text-slate-500">Ese día no hubo estudio registrado.</p>
    <p className="mt-2 text-[12px] font-medium text-slate-400">
      {dateLabel ? `(${dateLabel})` : null} Selecciona un día con actividad en el calendario para ver el detalle.
    </p>
  </div>
);
