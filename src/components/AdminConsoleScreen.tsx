import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Search, Shield, Trash2, UserPlus } from 'lucide-react';
import {
  AdminUserDirectoryEntry,
  AdminUserPracticeProfile,
  AdminWeakPracticeQuestion,
  adminCreateUser,
  adminDeleteUser,
  getAdminPracticeProfile,
  getAdminRecentPracticeSessions,
  getAdminUsers,
  getAdminWeakPracticeQuestions
} from '../services/adminApi';
import { PracticeSessionSummary } from '../practiceTypes';

const formatDate = (value: string | null) => {
  if (!value) return 'Sin datos';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
};

const AdminConsoleScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUserDirectoryEntry[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AdminUserPracticeProfile | null>(null);
  const [recentSessions, setRecentSessions] = useState<PracticeSessionSummary[]>([]);
  const [weakQuestions, setWeakQuestions] = useState<AdminWeakPracticeQuestion[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((entry) => entry.user_id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const loadUsers = async (nextSearch = search, preferredUserId: string | null = null) => {
    setLoadingUsers(true);
    setError(null);

    try {
      const directory = await getAdminUsers(nextSearch, 100);
      setUsers(directory);
      setSelectedUserId((current) => {
        if (preferredUserId && directory.some((entry) => entry.user_id === preferredUserId)) {
          return preferredUserId;
        }
        if (current && directory.some((entry) => entry.user_id === current)) {
          return current;
        }
        return directory[0]?.user_id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se ha podido cargar la lista de alumnos.');
      setUsers([]);
      setSelectedUserId(null);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserDetail = async (userId: string) => {
    setLoadingDetail(true);

    try {
      const [nextProfile, nextSessions, nextWeakQuestions] = await Promise.all([
        getAdminPracticeProfile(userId),
        getAdminRecentPracticeSessions(userId, 8),
        getAdminWeakPracticeQuestions(userId, 5)
      ]);

      setProfile(nextProfile);
      setRecentSessions(nextSessions);
      setWeakQuestions(nextWeakQuestions);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'No se ha podido cargar el detalle del alumno.');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadUsers('');
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setProfile(null);
      setRecentSessions([]);
      setWeakQuestions([]);
      return;
    }

    void loadUserDetail(selectedUserId);
  }, [selectedUserId]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createUsername.trim() || !createPassword.trim()) return;

    setCreating(true);
    setError(null);
    setNotice(null);

    try {
      const created = await adminCreateUser(createUsername, createPassword);
      setCreateUsername('');
      setCreatePassword('');
      setNotice(`Usuario ${created.current_username} creado correctamente.`);
      await loadUsers('', created.user_id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se ha podido crear el usuario.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || selectedUser.is_admin) return;

    if (!window.confirm(`Vas a borrar la cuenta ${selectedUser.current_username ?? selectedUser.user_id}. Esta accion no se puede deshacer.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setNotice(null);

    try {
      const deleted = await adminDeleteUser(selectedUser.user_id);
      setNotice(`Cuenta ${deleted.current_username ?? selectedUser.user_id} eliminada.`);
      await loadUsers(search);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se ha podido borrar la cuenta.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr]">
      <section className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Shield size={18} />
          </div>
          <div>
            <p className="text-base font-black text-slate-950">Administracion</p>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              Cuentas y seguimiento
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateUser} className="mt-4 grid gap-3 rounded-[1.3rem] border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-900">Crear alumno</p>
          <input
            value={createUsername}
            onChange={(event) => setCreateUsername(event.target.value)}
            placeholder="Usuario visible, por ejemplo opo1"
            className="w-full rounded-[1rem] border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none"
          />
          <input
            value={createPassword}
            onChange={(event) => setCreatePassword(event.target.value)}
            placeholder="Contraseña inicial"
            type="text"
            className="w-full rounded-[1rem] border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none"
          />
          <button
            type="submit"
            disabled={creating || !createUsername.trim() || !createPassword.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:opacity-60"
          >
            {creating ? <LoaderCircle size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Crear usuario
          </button>
        </form>

        <div className="mt-4 flex gap-2">
          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario, email o id"
              className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadUsers(search)}
            className="rounded-[1rem] bg-slate-950 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white"
          >
            Buscar
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {notice}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {loadingUsers ? (
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
              No hay usuarios para mostrar.
            </div>
          ) : (
            users.map((entry) => (
              <button
                key={entry.user_id}
                type="button"
                onClick={() => setSelectedUserId(entry.user_id)}
                className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition-colors ${
                  selectedUserId === entry.user_id
                    ? 'border-sky-300 bg-sky-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                      {entry.current_username ?? entry.auth_email ?? entry.user_id}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {entry.auth_email ?? entry.user_id}
                    </p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {entry.total_sessions} sesiones · {entry.accuracy}% acierto
                    </p>
                  </div>
                  {entry.is_admin ? (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">
                      admin
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
        {!selectedUser ? (
          <div className="flex min-h-[24rem] items-center justify-center rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
            Selecciona un alumno para ver su actividad.
          </div>
        ) : loadingDetail ? (
          <div className="flex min-h-[24rem] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
            <LoaderCircle size={18} className="mr-2 animate-spin" />
            Cargando detalle...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[1.35rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] p-4 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">Alumno</p>
              <h3 className="mt-1 text-2xl font-black">
                {selectedUser.current_username ?? selectedUser.auth_email ?? selectedUser.user_id}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-200">
                Ultimo acceso: {formatDate(selectedUser.last_sign_in_at)}
              </p>
              <p className="text-sm font-medium text-slate-200">
                Ultimo estudio: {formatDate(profile?.last_studied_at ?? selectedUser.last_studied_at)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Precision</p>
                <p className="mt-1.5 text-2xl font-black text-slate-950">{profile?.accuracy ?? selectedUser.accuracy}%</p>
              </div>
              <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Sesiones</p>
                <p className="mt-1.5 text-2xl font-black text-slate-950">{profile?.total_sessions ?? selectedUser.total_sessions}</p>
              </div>
              <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Respondidas</p>
                <p className="mt-1.5 text-2xl font-black text-slate-950">{profile?.total_answered ?? selectedUser.total_answered}</p>
              </div>
              <div className="rounded-[1.1rem] bg-slate-50 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Siguiente bloque</p>
                <p className="mt-1.5 text-2xl font-black text-slate-950">
                  {Math.floor((profile?.next_standard_batch_start_index ?? 0) / 20) + 1}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">Ultimas sesiones</p>
                  {!selectedUser.is_admin ? (
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-[0.95rem] bg-rose-600 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60"
                    >
                      {deleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Borrar cuenta
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 space-y-3">
                  {recentSessions.length === 0 ? (
                    <p className="text-sm font-medium text-slate-500">Todavia no hay sesiones registradas.</p>
                  ) : (
                    recentSessions.map((session) => (
                      <article key={session.id} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">{session.title}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(session.finishedAt)}</p>
                          </div>
                          <p className="text-lg font-black text-slate-950">
                            {session.score}/{session.total}
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">Preguntas mas falladas</p>
                <div className="mt-3 space-y-3">
                  {weakQuestions.length === 0 ? (
                    <p className="text-sm font-medium text-slate-500">Todavia no hay errores acumulados.</p>
                  ) : (
                    weakQuestions.map((question, index) => (
                      <details key={`${question.question_id}-${index}`} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-900">
                                Pregunta {question.question_number ?? question.question_id}
                              </p>
                              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {question.category ?? 'Sin grupo'}
                              </p>
                            </div>
                            <div className="rounded-[0.9rem] bg-rose-50 px-3 py-2 text-center">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">Fallos</p>
                              <p className="mt-1 text-lg font-black text-slate-900">{question.incorrect_attempts}</p>
                            </div>
                          </div>
                        </summary>
                        <p className="mt-3 text-sm font-bold leading-6 text-slate-800">{question.statement}</p>
                        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                          {question.explanation || 'Sin explicacion disponible.'}
                        </p>
                      </details>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminConsoleScreen;
