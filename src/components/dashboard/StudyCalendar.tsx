import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { SectionCard } from './shared';

interface StudyCalendarProps {
  sessions: Array<{ finishedAt: string }>;
  className?: string;
}

export const StudyCalendar: React.FC<StudyCalendarProps> = ({ sessions, className = '' }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const studyDays = useMemo(() => {
    const days = new Set<string>();
    sessions.forEach((s) => {
      try {
        const d = new Date(s.finishedAt);
        if (!isNaN(d.getTime())) {
          days.add(d.toISOString().split('T')[0]);
        }
      } catch (e) {
        // ignore invalid dates
      }
    });
    return days;
  }, [sessions]);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const days = [];
  const totalDays = daysInMonth(currentDate);
  const offset = (startDayOfMonth(currentDate) + 6) % 7; // Monday start

  // Empty cells
  for (let i = 0; i < offset; i++) days.push(null);
  // Real days
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <SectionCard className={`flex flex-col border-slate-200/50 bg-white shadow-sm ${className}`} translucent={false}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
            <CalendarIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Tu Constancia</p>
            <h3 className="text-lg font-black capitalize tracking-tight text-slate-950">
              {monthName} <span className="text-slate-300">{year}</span>
            </h3>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={prevMonth}
            aria-label="Mes anterior"
            title="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            aria-label="Mes siguiente"
            title="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((d) => (
          <div key={d} className="pb-2 text-center text-[11px] font-black text-slate-300">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="h-9 w-full" />;

          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isStudied = studyDays.has(dateStr);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div
              key={day}
              className={`relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-bold transition-all ${
                isStudied
                  ? 'quantia-bg-gradient text-white shadow-md'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              } ${isToday ? 'ring-2 ring-quantia-pink ring-offset-2' : ''}`}
            >
              {day}
              {isStudied && (
                 <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white/60" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md quantia-bg-gradient" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Estudiado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-slate-100" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Sin actividad</span>
        </div>
      </div>
    </SectionCard>
  );
};
