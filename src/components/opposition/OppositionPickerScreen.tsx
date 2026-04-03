import React from 'react';
import { AppLoadingSurface } from '../ui/app-loading-surface';
import ActiveOppositionCard from './ActiveOppositionCard';
import type { OppositionOption } from '../../domain/oppositions/types';

type OppositionPickerScreenProps = {
  oppositions: OppositionOption[];
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
  onSelect: (oppositionId: string) => void;
  onRefresh?: () => void;
};

const OppositionPickerScreen: React.FC<OppositionPickerScreenProps> = ({
  oppositions,
  loading = false,
  error = null,
  saving = false,
  onSelect,
  onRefresh,
}) => {
  if (loading) {
    return <AppLoadingSurface />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col justify-center px-4 py-8 sm:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(160deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.98)_40%,rgba(88,28,135,0.9)_100%)] p-5 text-white shadow-[0_28px_64px_-34px_rgba(15,23,42,0.42)] sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-200/85">
          Contexto activo
        </p>
        <h1 className="mt-2 text-[2rem] font-black leading-[0.96] tracking-[-0.05em] text-white sm:text-[2.35rem]">
          Elige tu oposicion actual
        </h1>
        <p className="mt-3 max-w-[34ch] text-[0.98rem] font-medium leading-[1.55] text-violet-100/82">
          La practica sigue siendo la misma; solo cambiamos el contexto de entrada para que la app
          se adapte a tu oposicion activa.
        </p>
      </section>

      <section className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Oposiciones activas
            </p>
            <h2 className="mt-1 text-[1.1rem] font-black leading-[1.12] tracking-[-0.03em] text-slate-950">
              Selecciona la ficha que vas a trabajar
            </h2>
          </div>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600"
            >
              Recargar
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {oppositions.length > 0 ? (
            oppositions.map((opposition) => (
              <ActiveOppositionCard
                key={opposition.id}
                opposition={opposition}
                disabled={saving}
                onSelect={onSelect}
              />
            ))
          ) : (
            <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-600">
              No hay oposiciones activas disponibles.
            </div>
          )}
        </div>

        {saving ? (
          <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            Guardando contexto activo...
          </p>
        ) : null}
      </section>
    </div>
  );
};

export default OppositionPickerScreen;
