import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCcw, Search, Trash2, TriangleAlert } from 'lucide-react';
import type { TelemetryEvent } from '../telemetry/telemetryClient';

type TelemetryFilter = 'all' | TelemetryEvent['kind'];
type TelemetrySignalLevel = 'normal' | 'warning' | 'critical';

type TelemetrySignal = {
  label: string | null;
  level: TelemetrySignalLevel;
  reason: string | null;
};

type AnalyzedEvent = {
  event: TelemetryEvent;
  signal: TelemetrySignal;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short',
  timeStyle: 'medium'
});
const MAX_VISIBLE_EVENTS = 24;
const SCREEN_READY_WARN_MS = 700;
const SCREEN_READY_CRITICAL_MS = 1400;
const RENDER_COMMIT_WARN_MS = 24;
const RENDER_COMMIT_CRITICAL_MS = 48;
const OPERATION_WARN_MS = 1200;
const OPERATION_CRITICAL_MS = 2500;

const kindLabel: Record<TelemetryEvent['kind'], string> = {
  navigation: 'Navegacion',
  operation: 'Operacion',
  query: 'Query',
  render: 'Render',
  vital: 'Vital'
};

const kindClassName: Record<TelemetryEvent['kind'], string> = {
  navigation: 'border-sky-200 bg-sky-50 text-sky-700',
  operation: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  query: 'border-rose-200 bg-rose-50 text-rose-700',
  render: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  vital: 'border-amber-200 bg-amber-50 text-amber-700'
};

const signalClassName: Record<TelemetrySignalLevel, string> = {
  normal: 'border-slate-200 bg-slate-50 text-slate-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-rose-200 bg-rose-50 text-rose-700'
};

const signalSurfaceClassName: Record<TelemetrySignalLevel, string> = {
  normal: 'border-white/82 bg-white/92',
  warning:
    'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))]',
  critical:
    'border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.94))]'
};

const readTelemetryBuffer = () => {
  if (typeof window === 'undefined') return [] as TelemetryEvent[];
  return [...(window.__quantiaTelemetryBuffer ?? [])].reverse();
};

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_TIME_FORMATTER.format(parsed);
};

const formatDuration = (value?: number) =>
  typeof value === 'number' ? `${Math.round(value * 10) / 10} ms` : '--';

const renderMetaPreview = (event: TelemetryEvent) => {
  if (!event.meta) return 'Sin meta';

  const entries = Object.entries(event.meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return entries.length > 0 ? entries.join(' | ') : 'Sin meta';
};

const resolveDurationLevel = (value: number, warningThreshold: number, criticalThreshold: number) => {
  if (value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'warning';
  return 'normal';
};

const getTelemetrySignal = (event: TelemetryEvent): TelemetrySignal => {
  if (event.status === 'error') {
    return {
      level: 'critical',
      label: 'Error',
      reason: 'Evento fallido'
    };
  }

  if (event.kind === 'vital') {
    if (event.rating === 'poor') {
      return {
        level: 'critical',
        label: 'Vital pobre',
        reason: 'Core web vital en zona pobre'
      };
    }

    if (event.rating === 'needs-improvement') {
      return {
        level: 'warning',
        label: 'Vital a vigilar',
        reason: 'Core web vital mejorable'
      };
    }
  }

  if (typeof event.durationMs !== 'number') {
    return {
      level: 'normal',
      label: null,
      reason: null
    };
  }

  if (event.kind === 'render' && event.name === 'screen_ready') {
    const level = resolveDurationLevel(
      event.durationMs,
      SCREEN_READY_WARN_MS,
      SCREEN_READY_CRITICAL_MS
    );
    return {
      level,
      label:
        level === 'critical'
          ? 'Pantalla critica'
          : level === 'warning'
            ? 'Pantalla lenta'
            : null,
      reason:
        level === 'normal'
          ? null
          : `Tiempo de pantalla lista en ${formatDuration(event.durationMs)}`
    };
  }

  if (event.kind === 'render' && event.name === 'react_profiler_commit') {
    const level = resolveDurationLevel(
      event.durationMs,
      RENDER_COMMIT_WARN_MS,
      RENDER_COMMIT_CRITICAL_MS
    );
    return {
      level,
      label:
        level === 'critical'
          ? 'Commit critico'
          : level === 'warning'
            ? 'Commit lento'
            : null,
      reason:
        level === 'normal' ? null : `Commit de React en ${formatDuration(event.durationMs)}`
    };
  }

  if (event.kind === 'operation') {
    const level = resolveDurationLevel(
      event.durationMs,
      OPERATION_WARN_MS,
      OPERATION_CRITICAL_MS
    );
    return {
      level,
      label:
        level === 'critical'
          ? 'Operacion critica'
          : level === 'warning'
            ? 'Operacion lenta'
            : null,
      reason:
        level === 'normal' ? null : `Operacion completada en ${formatDuration(event.durationMs)}`
    };
  }

  return {
    level: 'normal',
    label: null,
    reason: null
  };
};

const AdminTelemetryPanel: React.FC = () => {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [filter, setFilter] = useState<TelemetryFilter>('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [issuesOnly, setIssuesOnly] = useState(false);

  const refreshEvents = useCallback(() => {
    setEvents(readTelemetryBuffer());
  }, []);

  const clearEvents = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.__quantiaTelemetryBuffer = [];
    }
    setEvents([]);
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    if (!autoRefresh || typeof window === 'undefined') return undefined;

    const intervalId = window.setInterval(refreshEvents, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefresh, refreshEvents]);

  const analyzedEvents = useMemo<AnalyzedEvent[]>(
    () => events.map((event) => ({ event, signal: getTelemetrySignal(event) })),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return analyzedEvents.filter(({ event, signal }) => {
      if (filter !== 'all' && event.kind !== filter) return false;
      if (issuesOnly && signal.level === 'normal') return false;
      if (!normalizedSearch) return true;

      const haystack = [
        event.kind,
        event.name,
        event.status,
        event.severity,
        event.recordedAt,
        signal.label,
        signal.reason,
        renderMetaPreview(event)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [analyzedEvents, filter, issuesOnly, search]);

  const visibleEvents = useMemo(
    () => filteredEvents.slice(0, MAX_VISIBLE_EVENTS),
    [filteredEvents]
  );

  const summary = useMemo(() => {
    const renderEvents = analyzedEvents.filter(({ event }) => event.kind === 'render');
    const screenReadyEvents = renderEvents.filter(({ event }) => event.name === 'screen_ready');
    const issueEvents = analyzedEvents.filter(({ signal }) => signal.level !== 'normal');
    const criticalEvents = issueEvents.filter(({ signal }) => signal.level === 'critical');
    const errorEvents = analyzedEvents.filter(({ event }) => event.status === 'error');
    const slowestReady = screenReadyEvents.reduce<AnalyzedEvent | null>((slowest, event) => {
      if (!slowest) return event;
      return (event.event.durationMs ?? 0) > (slowest.event.durationMs ?? 0) ? event : slowest;
    }, null);
    const latestReady = screenReadyEvents[0] ?? null;

    const readyByScreen = screenReadyEvents.reduce<
      Record<string, { count: number; total: number; max: number }>
    >((result, entry) => {
      const screen = String(entry.event.meta?.screen ?? 'unknown');
      const duration = entry.event.durationMs ?? 0;
      const current = result[screen] ?? { count: 0, total: 0, max: 0 };
      current.count += 1;
      current.total += duration;
      current.max = Math.max(current.max, duration);
      result[screen] = current;
      return result;
    }, {});

    const topSlowScreens = Object.entries(readyByScreen)
      .map(([screen, metrics]) => {
        const avg = metrics.total / Math.max(metrics.count, 1);
        const level = resolveDurationLevel(avg, SCREEN_READY_WARN_MS, SCREEN_READY_CRITICAL_MS);
        return {
          avg,
          count: metrics.count,
          level,
          max: metrics.max,
          screen
        };
      })
      .sort((left, right) => right.avg - left.avg)
      .slice(0, 4);

    const activeAlerts = [
      criticalEvents.length > 0
        ? `${criticalEvents.length} eventos criticos en buffer`
        : null,
      topSlowScreens[0] && topSlowScreens[0].level !== 'normal'
        ? `${topSlowScreens[0].screen} promedia ${formatDuration(topSlowScreens[0].avg)}`
        : null,
      latestReady && latestReady.signal.level !== 'normal'
        ? `Ultima pantalla lista: ${formatDuration(latestReady.event.durationMs)}`
        : null
    ].filter(Boolean) as string[];

    return {
      activeAlerts,
      criticalCount: criticalEvents.length,
      errorCount: errorEvents.length,
      issueCount: issueEvents.length,
      latestReady,
      renderCount: renderEvents.length,
      screenReadyCount: screenReadyEvents.length,
      slowestReady,
      topSlowScreens,
      totalCount: events.length
    };
  }, [analyzedEvents, events.length]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(235,245,255,0.88),rgba(245,249,255,0.92))] px-4 py-3 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.12)]">
        <div>
          <p className="text-sm font-extrabold text-slate-950">Observabilidad local</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Lee el buffer de telemetria del navegador para detectar pantallas lentas y errores recientes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIssuesOnly((current) => !current)}
            className={`rounded-full border px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all duration-200 ${
              issuesOnly
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {issuesOnly ? 'Solo alertas on' : 'Solo alertas off'}
          </button>
          <button
            type="button"
            onClick={() => setAutoRefresh((current) => !current)}
            className={`rounded-full border px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all duration-200 ${
              autoRefresh
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {autoRefresh ? 'Auto refresh on' : 'Auto refresh off'}
          </button>
          <button
            type="button"
            onClick={refreshEvents}
            className="inline-flex items-center gap-2 rounded-full border border-white/82 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd2f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98]"
          >
            <RefreshCcw size={13} />
            Refrescar
          </button>
          <button
            type="button"
            onClick={clearEvents}
            className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-700 shadow-[0_12px_24px_-22px_rgba(244,63,94,0.14)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100 active:translate-y-0 active:scale-[0.98]"
          >
            <Trash2 size={13} />
            Vaciar buffer
          </button>
        </div>
      </div>

      <div
        className={`rounded-[1.1rem] border px-4 py-3 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.18)] ${
          summary.criticalCount > 0
            ? 'border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.94))]'
            : summary.issueCount > 0
              ? 'border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))]'
              : 'border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.94))]'
        }`}
      >
        <div className="flex items-center gap-2">
          <TriangleAlert size={16} className={summary.issueCount > 0 ? 'text-amber-600' : 'text-emerald-600'} />
          <p className="text-sm font-extrabold text-slate-950">
            {summary.criticalCount > 0
              ? 'Hay eventos criticos que revisar'
              : summary.issueCount > 0
                ? 'Hay senales de rendimiento a vigilar'
                : 'Buffer saludable por ahora'}
          </p>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {summary.activeAlerts.length > 0 ? (
            summary.activeAlerts.map((alert) => (
              <div
                key={alert}
                className="rounded-[0.95rem] border border-white/70 bg-white/75 px-3 py-2 text-[12px] font-semibold leading-5 text-slate-700"
              >
                {alert}
              </div>
            ))
          ) : (
            <div className="rounded-[0.95rem] border border-white/70 bg-white/75 px-3 py-2 text-[12px] font-semibold leading-5 text-slate-700 md:col-span-3">
              No se detectan pantallas listas lentas, commits caros ni errores recientes en el buffer actual.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.05rem] border border-white/82 bg-white/92 px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            Eventos
          </p>
          <p className="mt-1.5 text-[1.3rem] font-black leading-none text-slate-950">
            {summary.totalCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Buffer local actual</p>
        </div>

        <div className="rounded-[1.05rem] border border-white/82 bg-white/92 px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            Render
          </p>
          <p className="mt-1.5 text-[1.3rem] font-black leading-none text-slate-950">
            {summary.renderCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {summary.screenReadyCount} pantallas listas
          </p>
        </div>

        <div className="rounded-[1.05rem] border border-white/82 bg-white/92 px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            Ultima lista
          </p>
          <p className="mt-1.5 text-[1.1rem] font-black leading-none text-slate-950">
            {formatDuration(summary.latestReady?.event.durationMs)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {String(summary.latestReady?.event.meta?.screen ?? 'Sin dato')}
          </p>
        </div>

        <div className="rounded-[1.05rem] border border-white/82 bg-white/92 px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            Alertas
          </p>
          <p className="mt-1.5 text-[1.3rem] font-black leading-none text-slate-950">
            {summary.issueCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {summary.errorCount} errores, {summary.criticalCount} criticas
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-[1.15rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-4 py-3.5 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-sky-600" />
            <p className="text-sm font-extrabold text-slate-950">Pantallas mas lentas</p>
          </div>
          <div className="mt-3 space-y-2.5">
            {summary.topSlowScreens.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">Todavia no hay `screen_ready` registrados.</p>
            ) : (
              summary.topSlowScreens.map((entry) => (
                <div
                  key={entry.screen}
                  className={`rounded-[1rem] border px-3 py-2.5 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.12)] ${signalSurfaceClassName[entry.level]}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-extrabold text-slate-900">{entry.screen}</p>
                    {entry.level !== 'normal' ? (
                      <span
                        className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] ${signalClassName[entry.level]}`}
                      >
                        {entry.level === 'critical' ? 'critica' : 'vigilar'}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    <span>Media {formatDuration(entry.avg)}</span>
                    <span>Max {formatDuration(entry.max)}</span>
                    <span>{entry.count} muestras</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-4 py-3.5 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.18)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-950">Eventos recientes</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Ultimos {Math.min(filteredEvents.length, MAX_VISIBLE_EVENTS)} de {filteredEvents.length} filtrados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar evento o screen"
                  className="rounded-[0.95rem] border border-white/82 bg-white/92 py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as TelemetryFilter)}
                className="rounded-[0.95rem] border border-white/82 bg-white/92 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">Todos</option>
                <option value="render">Render</option>
                <option value="navigation">Navegacion</option>
                <option value="operation">Operacion</option>
                <option value="query">Query</option>
                <option value="vital">Vital</option>
              </select>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {visibleEvents.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-[#d7e4fb] bg-white/88 px-4 py-5 text-center">
                <p className="text-sm font-extrabold text-slate-900">No hay eventos para esta vista</p>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500">
                  Prueba a navegar por la app o cambia el filtro para ver mas actividad.
                </p>
              </div>
            ) : (
              visibleEvents.map(({ event, signal }, index) => (
                <article
                  key={`${event.recordedAt}-${event.kind}-${event.name}-${index}`}
                  className={`rounded-[1rem] border px-3.5 py-3 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.12)] ${signalSurfaceClassName[signal.level]}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] ${kindClassName[event.kind]}`}
                        >
                          {kindLabel[event.kind]}
                        </span>
                        {signal.label ? (
                          <span
                            className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] ${signalClassName[signal.level]}`}
                          >
                            {signal.label}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-extrabold text-slate-950">{event.name}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        {signal.reason ?? renderMetaPreview(event)}
                      </p>
                      {signal.reason && event.meta ? (
                        <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
                          {renderMetaPreview(event)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-slate-900">
                        {event.durationMs !== undefined
                          ? formatDuration(event.durationMs)
                          : event.value !== undefined
                            ? String(event.value)
                            : '--'}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {formatTimestamp(event.recordedAt)}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTelemetryPanel;
