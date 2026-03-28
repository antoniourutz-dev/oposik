import React from 'react';
import { ArrowRight, DoorOpen, Eye, ShieldCheck, Sparkles } from 'lucide-react';

type GuestDashboardScreenProps = {
  remainingBlocks: number;
  maxBlocks: number;
  loading: boolean;
  onStart: () => void;
  onExit: () => void;
};

const GuestDashboardScreen: React.FC<GuestDashboardScreenProps> = ({
  remainingBlocks,
  maxBlocks,
  loading,
  onStart,
  onExit
}) => {
  const nextBlockNumber = Math.min(maxBlocks, maxBlocks - remainingBlocks + 1);
  const isLocked = remainingBlocks <= 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-0 py-3 sm:px-2 lg:px-4">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-4 text-white shadow-[0_28px_60px_-34px_rgba(141,147,242,0.24)] sm:p-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-white/14" />
          <div className="absolute right-12 top-14 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/86 backdrop-blur-sm">
            <Sparkles size={14} />
            Acceso invitado
          </div>

          <h1 className="mt-4 max-w-[18rem] text-[2rem] font-black leading-[0.94] tracking-[-0.05em] text-white sm:max-w-[24rem] sm:text-[2.5rem]">
            Prueba la app sin entrar
          </h1>
          <p className="mt-3 max-w-[23rem] text-sm font-medium leading-6 text-sky-50/84 sm:text-[0.98rem]">
            Dos bloques aleatorios del temario comun, revision completa al terminar y nada mas.
            Sin estadisticas, sin perfil y sin progreso guardado.
          </p>

          <div className="mt-5 rounded-[1.35rem] border border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] p-3.5 text-slate-950 shadow-[0_24px_42px_-28px_rgba(141,147,242,0.24)] sm:p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              {isLocked ? 'Acceso agotado' : `Bloque ${nextBlockNumber} de ${maxBlocks}`}
            </p>
            <h2 className="mt-2 text-[1.45rem] font-black leading-[0.98] tracking-[-0.04em] text-slate-950">
              {isLocked ? 'La prueba ya esta cerrada' : 'Entrar al bloque de prueba'}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              {isLocked
                ? 'Has consumido los dos bloques de invitado en este dispositivo. Para seguir, entra con tu usuario.'
                : 'Cada bloque abre 20 preguntas aleatorias y te deja ver la revision completa al terminar.'}
            </p>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={isLocked ? onExit : onStart}
                disabled={loading}
                className="group inline-flex min-h-[52px] flex-1 items-center justify-between rounded-[1.15rem] border border-[#c4d7fb] bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-4 py-3 text-left text-white shadow-[0_18px_34px_-22px_rgba(141,147,242,0.34)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span>
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/82">
                    {isLocked ? 'Siguiente paso' : 'Abrir ahora'}
                  </span>
                  <span className="mt-1 block text-[1rem] font-black leading-none">
                    {loading
                      ? 'Preparando bloque...'
                      : isLocked
                        ? 'Volver al acceso'
                        : `Bloque ${nextBlockNumber}`}
                  </span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/28 bg-white/12">
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={onExit}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-extrabold text-slate-700 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd2f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99]"
              >
                <DoorOpen size={16} />
                Volver al acceso
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.45rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,249,255,0.92))] p-3.5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.18)] sm:p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
          Lo que si incluye
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-[1.1rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-3.5 py-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.16))] text-slate-700">
              <Sparkles size={17} />
            </span>
            <p className="mt-3 text-sm font-black text-slate-950">Temario comun</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Sin rutas, sin mezcla guiada y sin datos del banco.
            </p>
          </div>

          <div className="rounded-[1.1rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-3.5 py-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.16))] text-slate-700">
              <Eye size={17} />
            </span>
            <p className="mt-3 text-sm font-black text-slate-950">Revision completa</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Respuesta correcta, fallo y explicacion al terminar.
            </p>
          </div>

          <div className="rounded-[1.1rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-3.5 py-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.16))] text-slate-700">
              <ShieldCheck size={17} />
            </span>
            <p className="mt-3 text-sm font-black text-slate-950">Sin historial</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              No se guarda progreso ni se abren stats, estudio o perfil.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GuestDashboardScreen;
