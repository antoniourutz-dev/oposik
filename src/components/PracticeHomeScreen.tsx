import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  ChartColumnIncreasing,
  CircleUserRound,
  Flame,
  Layers3,
  Plus,
  RotateCcw,
  Target
} from 'lucide-react';
import { PracticePlayer, WeakQuestionInsight } from '../practiceTypes';
import { getAccuracy } from '../utils/practiceStats';

type PracticeHomeScreenProps = {
  player: PracticePlayer | null;
  players: PracticePlayer[];
  questionsCount: number;
  totalBatches: number;
  batchSize: number;
  recommendedBatchNumber: number;
  weakQuestions: WeakQuestionInsight[];
  weakCategories: Array<{ category: string; incorrectAttempts: number; attempts: number }>;
  onStartRecommended: () => void;
  onStartFromBeginning: () => void;
  onStartWeakReview: () => void;
  onReloadQuestions: () => void;
  onSwitchPlayer: (playerId: string) => void;
  onCreatePlayer: (name: string) => void;
  onRenamePlayer: (name: string) => void;
};

const formatSessionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const PracticeHomeScreen: React.FC<PracticeHomeScreenProps> = ({
  player,
  players,
  questionsCount,
  totalBatches,
  batchSize,
  recommendedBatchNumber,
  weakQuestions,
  weakCategories,
  onStartRecommended,
  onStartFromBeginning,
  onStartWeakReview,
  onReloadQuestions,
  onSwitchPlayer,
  onCreatePlayer,
  onRenamePlayer
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingName, setEditingName] = useState(player?.name ?? '');

  const accuracy = getAccuracy(player?.totalCorrect ?? 0, player?.totalAnswered ?? 0);
  const weakestReviewAvailable = weakQuestions.length > 0;

  useEffect(() => {
    setEditingName(player?.name ?? '');
  }, [player?.name]);

  const playerOptions = useMemo(
    () => [...players].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [players]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-800/60 bg-[linear-gradient(135deg,#0f172a_0%,#13233f_60%,#1d4ed8_100%)] p-6 text-white shadow-[0_42px_110px_-55px_rgba(15,23,42,0.85)] sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.35),transparent_72%)]" />
          <div className="absolute bottom-0 right-16 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.25),transparent_72%)]" />

          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">
            Practica y mejora.
          </h2>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-200/90">
            Continua por tu siguiente bloque o repasa directamente las preguntas que mas fallas.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartRecommended}
              className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition-colors hover:bg-slate-100"
            >
              Continuar por el bloque {recommendedBatchNumber}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={onStartWeakReview}
              disabled={!weakestReviewAvailable}
              className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] border border-white/15 bg-white/10 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Brain size={16} />
              Repasar puntos debiles
            </button>
          </div>
        </div>

        <div className="rounded-[2.25rem] border border-white/70 bg-white/80 p-6 shadow-[0_36px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CircleUserRound size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Jugador activo
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">{player?.name ?? 'Sin jugador'}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Cambiar jugador
              </span>
              <select
                value={player?.id ?? ''}
                onChange={(event) => onSwitchPlayer(event.target.value)}
                className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-amber-300"
              >
                {playerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Renombrar jugador
              </span>
              <div className="flex gap-2">
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="min-w-0 flex-1 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-amber-300"
                  placeholder="Nombre visible"
                />
                <button
                  type="button"
                  onClick={() => onRenamePlayer(editingName)}
                  disabled={!editingName.trim()}
                  className="rounded-[1.1rem] border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Crear jugador
              </span>
              <div className="flex gap-2">
                <input
                  value={newPlayerName}
                  onChange={(event) => setNewPlayerName(event.target.value)}
                  className="min-w-0 flex-1 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-amber-300"
                  placeholder="Ej. Marta"
                />
                <button
                  type="button"
                  onClick={() => {
                    onCreatePlayer(newPlayerName);
                    setNewPlayerName('');
                  }}
                  disabled={!newPlayerName.trim()}
                  className="inline-flex items-center gap-2 rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Precision</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{accuracy}%</p>
            </div>
            <Target className="h-10 w-10 text-emerald-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            {player?.totalCorrect ?? 0} aciertos sobre {player?.totalAnswered ?? 0} respuestas acumuladas.
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Sesiones</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{player?.totalSessions ?? 0}</p>
            </div>
            <ChartColumnIncreasing className="h-10 w-10 text-sky-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Cada bloque completado alimenta tus estadisticas y tu mapa de errores.
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Bloque recomendado</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{recommendedBatchNumber}</p>
            </div>
            <Layers3 className="h-10 w-10 text-amber-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Ruta principal: bloques de {batchSize} preguntas, {totalBatches} bloques en total.
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Banco visible</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{questionsCount}</p>
            </div>
            <BookOpenCheck className="h-10 w-10 text-violet-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Preguntas activas en Supabase listas para practicar o revisar.
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_34px_90px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600">
                Tus 5 preguntas mas falladas
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">
                Puntos debiles prioritarios
              </h3>
            </div>
            <button
              type="button"
              onClick={onStartWeakReview}
              disabled={!weakestReviewAvailable}
              className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Flame size={16} />
              Practicar top 5
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {weakQuestions.length === 0 && (
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-5 py-4">
                <p className="text-sm font-bold text-emerald-900">
                  Aun no hay errores acumulados. Completa algunos bloques y aqui apareceran tus preguntas mas conflictivas.
                </p>
              </div>
            )}

            {weakQuestions.map(({ question, stat }, index) => {
              const failureRate = Math.round((stat.incorrectAttempts / Math.max(stat.attempts, 1)) * 100);

              return (
                <details
                  key={question.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white/80 px-5 py-4"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
                            Top {index + 1}
                          </span>
                          {question.category && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                              {question.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm font-black leading-6 text-slate-900">{question.statement}</p>
                      </div>

                      <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
                        <div className="rounded-2xl bg-rose-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">Fallos</p>
                          <p className="mt-1 text-lg font-black text-slate-900">{stat.incorrectAttempts}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Tasa</p>
                          <p className="mt-1 text-lg font-black text-slate-900">{failureRate}%</p>
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Respuesta correcta
                      </p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                        {question.correctOption.toUpperCase()}) {question.options[question.correctOption]}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                        Explicacion
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                        {question.explanation || 'Esta pregunta aun no tiene explicacion cargada.'}
                      </p>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_34px_90px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">
                  Grupos a reforzar
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Radar tematico</h3>
              </div>
              <Brain className="h-8 w-8 text-sky-500" />
            </div>

            <div className="mt-5 space-y-3">
              {weakCategories.length === 0 && (
                <p className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
                  Aun no hay suficientes datos para identificar grupos debiles.
                </p>
              )}

              {weakCategories.map((item) => {
                const ratio = Math.round((item.incorrectAttempts / Math.max(item.attempts, 1)) * 100);

                return (
                  <div key={item.category} className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">{item.category}</p>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        {item.incorrectAttempts} fallos
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
                        style={{ width: `${Math.min(100, ratio)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      {ratio}% de error dentro de este grupo.
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_34px_90px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">
                  Actividad reciente
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Ultimas sesiones</h3>
              </div>
              <RotateCcw className="h-8 w-8 text-violet-500" />
            </div>

            <div className="mt-5 space-y-3">
              {player?.recentSessions.length ? (
                player.recentSessions.slice(0, 5).map((session) => (
                  <article
                    key={session.id}
                    className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{session.title}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          {formatSessionDate(session.finishedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Resultado
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-900">
                          {session.score}/{session.total}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
                  Todavia no hay sesiones guardadas para este jugador.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_34px_90px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Acciones
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Atajos utiles</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={onStartFromBeginning}
                className="inline-flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <span>
                  <span className="block text-sm font-black text-slate-900">Reiniciar desde el bloque 1</span>
                  <span className="mt-1 block text-sm font-medium text-slate-500">
                    Recorre el temario completo desde el inicio.
                  </span>
                </span>
                <ArrowRight size={18} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onReloadQuestions}
                className="inline-flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <span>
                  <span className="block text-sm font-black text-slate-900">Sincronizar preguntas</span>
                  <span className="mt-1 block text-sm font-medium text-slate-500">
                    Vuelve a consultar el banco actual de Supabase.
                  </span>
                </span>
                <RotateCcw size={18} className="text-slate-400" />
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default PracticeHomeScreen;
