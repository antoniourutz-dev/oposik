import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyRound,
  Layers3,
  LoaderCircle,
  PencilLine,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  AdminUserDirectoryEntry,
  AdminUserPracticeProfile,
  AdminWeakPracticeQuestion,
  adminChangeUsername,
  adminCreateUser,
  adminDeleteUser,
  adminResetPracticeProgress,
  adminSetUserPlayerMode,
  adminSetUserPassword,
  getAdminPracticeProfile,
  getAdminRecentPracticeSessions,
  getAdminUsers,
  getAdminWeakPracticeQuestions,
} from '../services/adminApi';
import type { AccountPlayerMode } from '../services/accountApi';
import ScreenTelemetryBoundary from '../telemetry/ScreenTelemetryBoundary';
import AdminTelemetryPanel from './AdminTelemetryPanel';
import QuestionExplanation from './QuestionExplanation';
import { DEFAULT_CURRICULUM, PRACTICE_BATCH_SIZE } from '../practiceConfig';
import { PracticeSessionSummary } from '../practiceTypes';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const INITIAL_ADMIN_USERS_RENDER_COUNT = 24;
const ADMIN_USERS_RENDER_STEP = 18;

const formatPlayerModeLabel = (value: AccountPlayerMode) =>
  value === 'generic' ? 'Generico' : 'Avanzado';

const formatDate = (value: string | null) => {
  if (!value) return 'Sin datos';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return DATE_TIME_FORMATTER.format(parsed);
};

const isInternalAuthEmail = (value: string | null) =>
  Boolean(value && value.trim().toLowerCase().endsWith('@quantia.app'));

const AdminSurface: React.FC<
  React.PropsWithChildren<{ className?: string; title?: string; hint?: string }>
> = ({ className = '', title, hint, children }) => (
  <section
    className={`rounded-[1.45rem] border border-white/72 bg-white/88 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.3)] backdrop-blur ${className}`}
  >
    {title ? (
      <div className="mb-3">
        <p className="text-[1.02rem] font-extrabold tracking-[-0.02em] text-slate-950">{title}</p>
        {hint ? <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p> : null}
      </div>
    ) : null}
    {children}
  </section>
);

const AdminDisclosure: React.FC<
  React.PropsWithChildren<{ title: string; hint: string; defaultOpen?: boolean }>
> = ({ title, hint, defaultOpen = false, children }) => (
  <details
    open={defaultOpen}
    className="rounded-[1.2rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.9))] px-4 py-4 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.18)]"
  >
    <summary className="cursor-pointer list-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold tracking-[-0.02em] text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
          detalle
        </span>
      </div>
    </summary>
    <div className="mt-4">{children}</div>
  </details>
);

const AdminCompactMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[1.05rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1.5 text-[1.2rem] font-black leading-none text-slate-950">{value}</p>
  </div>
);

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-[22rem] items-center justify-center rounded-[1.2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.9))] px-4 py-6 text-center text-sm font-semibold text-slate-500">
    {children}
  </div>
);

const AdminUserListItem = React.memo(
  ({
    entry,
    isSelected,
    onSelect,
  }: {
    entry: AdminUserDirectoryEntry;
    isSelected: boolean;
    onSelect: (userId: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect(entry.user_id)}
      className={`w-full rounded-[1.1rem] border px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.995] ${
        isSelected
          ? 'border-[#bfd2f6] bg-[linear-gradient(180deg,rgba(235,245,255,0.92),rgba(245,249,255,0.96))] shadow-[0_18px_34px_-28px_rgba(141,147,242,0.16)]'
          : 'border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.9))] hover:-translate-y-0.5 hover:border-[#c8d8f8] hover:shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-900">
            {entry.current_username ?? entry.user_id}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {isInternalAuthEmail(entry.auth_email)
              ? `Acceso: ${entry.current_username ?? 'sin usuario'}`
              : (entry.auth_email ?? entry.user_id)}
          </p>
          <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {entry.total_sessions} sesiones · {entry.accuracy}% acierto
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {entry.is_admin ? (
            <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(141,147,242,0.22))] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
              admin
            </span>
          ) : null}
          <span className="rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
            {formatPlayerModeLabel(entry.player_mode)}
          </span>
        </div>
      </div>
    </button>
  ),
);

AdminUserListItem.displayName = 'AdminUserListItem';

const AdminRecentSessionCard = React.memo(({ session }: { session: PracticeSessionSummary }) => (
  <article className="rounded-[1.1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-4 py-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.16)]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-extrabold text-slate-900">{session.title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {formatDate(session.finishedAt)}
        </p>
      </div>
      <p className="text-lg font-black text-slate-950">
        {session.score}
        <span className="text-sm text-slate-400">/{session.total}</span>
      </p>
    </div>
  </article>
));

AdminRecentSessionCard.displayName = 'AdminRecentSessionCard';

const AdminWeakQuestionCard = React.memo(
  ({ question }: { question: AdminWeakPracticeQuestion }) => {
    const [isExplanationOpen, setIsExplanationOpen] = useState(false);

    return (
      <details
        className="rounded-[1.1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-4 py-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]"
        onToggle={(event) => {
          setIsExplanationOpen(event.currentTarget.open);
        }}
      >
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                Pregunta {question.question_number ?? question.question_id}
              </p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                {question.category ?? 'Sin grupo'}
              </p>
            </div>
            <div className="rounded-[0.95rem] bg-[linear-gradient(180deg,rgba(255,241,242,1),rgba(255,228,230,0.92))] px-3 py-2 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-700">
                Fallos
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {question.incorrect_attempts}
              </p>
            </div>
          </div>
        </summary>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{question.statement}</p>
        {isExplanationOpen ? (
          <div className="mt-3 rounded-[1rem] bg-[linear-gradient(180deg,rgba(232,240,255,0.92),rgba(241,247,255,0.92))] px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">
              Explicacion
            </p>
            <div className="mt-2">
              <QuestionExplanation
                explanation={question.explanation}
                editorialExplanation={question.editorial_explanation}
              />
            </div>
          </div>
        ) : null}
      </details>
    );
  },
);

AdminWeakQuestionCard.displayName = 'AdminWeakQuestionCard';

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
  const [createPlayerMode, setCreatePlayerMode] = useState<AccountPlayerMode>('advanced');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPlayerMode, setEditPlayerMode] = useState<AccountPlayerMode>('advanced');
  const [creating, setCreating] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPlayerMode, setSavingPlayerMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingProgress, setResettingProgress] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [renderedUserCount, setRenderedUserCount] = useState(INITIAL_ADMIN_USERS_RENDER_COUNT);
  const userListRef = useRef<HTMLDivElement | null>(null);
  const userLoadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const selectedUser = useMemo(
    () => users.find((entry) => entry.user_id === selectedUserId) ?? null,
    [selectedUserId, users],
  );
  const visibleUsers = useMemo(() => users.slice(0, renderedUserCount), [renderedUserCount, users]);
  const hasMoreUsers = renderedUserCount < users.length;
  const remainingUsers = Math.max(users.length - renderedUserCount, 0);
  const visibleRecentSessions = useMemo(() => recentSessions.slice(0, 4), [recentSessions]);
  const visibleWeakQuestions = useMemo(() => weakQuestions.slice(0, 3), [weakQuestions]);
  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);
  const loadMoreUsers = useCallback(() => {
    setRenderedUserCount((currentCount) =>
      Math.min(users.length, currentCount + ADMIN_USERS_RENDER_STEP),
    );
  }, [users.length]);
  const adminTelemetryMeta = useMemo(
    () => ({
      loadingDetail,
      loadingUsers,
      recentSessionCount: recentSessions.length,
      selectedUserId: selectedUserId ?? 'none',
      userCount: users.length,
      weakQuestionCount: weakQuestions.length,
    }),
    [
      loadingDetail,
      loadingUsers,
      recentSessions.length,
      selectedUserId,
      users.length,
      weakQuestions.length,
    ],
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
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se ha podido cargar la lista de alumnos.',
      );
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
        getAdminPracticeProfile(userId, DEFAULT_CURRICULUM),
        getAdminRecentPracticeSessions(userId, 8, DEFAULT_CURRICULUM),
        getAdminWeakPracticeQuestions(userId, 5, DEFAULT_CURRICULUM),
      ]);

      setProfile(nextProfile);
      setRecentSessions(nextSessions);
      setWeakQuestions(nextWeakQuestions);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : 'No se ha podido cargar el detalle del alumno.',
      );
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

  useEffect(() => {
    setEditUsername(selectedUser?.current_username ?? '');
    setEditPassword('');
    setEditPlayerMode(selectedUser?.player_mode ?? 'advanced');
  }, [selectedUser?.current_username, selectedUser?.player_mode, selectedUser?.user_id]);

  useEffect(() => {
    setRenderedUserCount(Math.min(users.length, INITIAL_ADMIN_USERS_RENDER_COUNT));
  }, [users.length, search]);

  useEffect(() => {
    if (
      !hasMoreUsers ||
      !userListRef.current ||
      !userLoadMoreSentinelRef.current ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadMoreUsers();
        observer.disconnect();
      },
      {
        root: userListRef.current,
        rootMargin: '0px 0px 220px 0px',
        threshold: 0.01,
      },
    );

    observer.observe(userLoadMoreSentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreUsers, loadMoreUsers, renderedUserCount]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createUsername.trim() || !createPassword.trim()) return;

    setCreating(true);
    setError(null);
    setNotice(null);

    try {
      const created = await adminCreateUser(createUsername, createPassword, createPlayerMode);
      setCreateUsername('');
      setCreatePassword('');
      setCreatePlayerMode('advanced');
      setNotice(
        `Usuario ${created.current_username} creado correctamente en modo ${formatPlayerModeLabel(created.player_mode).toLowerCase()}.`,
      );
      await loadUsers('', created.user_id);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'No se ha podido crear el usuario.',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || selectedUser.is_admin) return;

    if (
      !window.confirm(
        `Vas a borrar la cuenta ${
          selectedUser.current_username ?? selectedUser.user_id
        }. Esta accion no se puede deshacer.`,
      )
    ) {
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
      setError(
        deleteError instanceof Error ? deleteError.message : 'No se ha podido borrar la cuenta.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPracticeProgress = async () => {
    if (!selectedUser || selectedUser.is_admin) return;

    if (
      !window.confirm(
        `Vas a reiniciar las estadisticas de ${
          selectedUser.current_username ?? selectedUser.user_id
        }. Se borraran sesiones, respuestas y progreso adaptativo, pero la cuenta seguira activa.`,
      )
    ) {
      return;
    }

    setResettingProgress(true);
    setError(null);
    setNotice(null);

    try {
      const reset = await adminResetPracticeProgress(selectedUser.user_id, null);
      await loadUsers(search, selectedUser.user_id);
      await loadUserDetail(selectedUser.user_id);
      setNotice(
        `Progreso reiniciado: ${reset.sessions_deleted} sesiones, ${reset.attempts_deleted} respuestas y ${reset.question_states_deleted} estados de aprendizaje.`,
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'No se ha podido reiniciar el progreso del alumno.',
      );
    } finally {
      setResettingProgress(false);
    }
  };

  const handleChangeUsername = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser || selectedUser.is_admin || !editUsername.trim()) return;

    setSavingUsername(true);
    setError(null);
    setNotice(null);

    try {
      const changed = await adminChangeUsername(selectedUser.user_id, editUsername, 'admin_panel');
      await loadUsers(search, selectedUser.user_id);
      await loadUserDetail(selectedUser.user_id);
      setEditUsername(changed.new_username);
      setNotice(
        changed.warning
          ? `Usuario actualizado a ${changed.new_username}. ${changed.warning}`
          : `Usuario actualizado a ${changed.new_username}.`,
      );
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : 'No se ha podido actualizar el nombre del alumno.',
      );
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser || selectedUser.is_admin || !editPassword.trim()) return;

    setSavingPassword(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminSetUserPassword(selectedUser.user_id, editPassword);
      setEditPassword('');
      setNotice(`Contrasena actualizada para ${updated.current_username ?? selectedUser.user_id}.`);
    } catch (passwordError) {
      setError(
        passwordError instanceof Error
          ? passwordError.message
          : 'No se ha podido actualizar la contrasena.',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSetPlayerMode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser || selectedUser.is_admin) return;
    if (editPlayerMode === selectedUser.player_mode) return;

    setSavingPlayerMode(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminSetUserPlayerMode(selectedUser.user_id, editPlayerMode);
      await loadUsers(search, selectedUser.user_id);
      await loadUserDetail(selectedUser.user_id);
      setEditPlayerMode(updated.player_mode);
      setNotice(
        `Modo actualizado a ${formatPlayerModeLabel(updated.player_mode).toLowerCase()} para ${updated.current_username ?? selectedUser.user_id}.`,
      );
    } catch (modeError) {
      setError(
        modeError instanceof Error
          ? modeError.message
          : 'No se ha podido actualizar el modo del alumno.',
      );
    } finally {
      setSavingPlayerMode(false);
    }
  };

  const nextBatchNumber =
    Math.floor((profile?.next_standard_batch_start_index ?? 0) / PRACTICE_BATCH_SIZE) + 1;

  return (
    <ScreenTelemetryBoundary screen="admin:console" meta={adminTelemetryMeta}>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminSurface>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] quantia-bg-gradient text-white shadow-[0_16px_24px_-18px_rgba(141,147,242,0.3)]">
              <Shield size={18} />
            </div>
            <div>
              <p className="text-base font-extrabold tracking-[-0.02em] text-slate-950">
                Administracion
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Cuentas y seguimiento
              </p>
            </div>
          </div>

          <div className="mt-4">
            <AdminDisclosure
              title="Operaciones"
              hint="Crear alumnos y filtrar la lista solo cuando haga falta."
            >
              <form
                onSubmit={handleCreateUser}
                className="grid gap-3 rounded-[1.2rem] border border-[#bfd2f6] bg-[linear-gradient(180deg,rgba(235,245,255,0.88),rgba(245,249,255,0.92))] p-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.12)]"
              >
                <p className="text-sm font-extrabold text-slate-900">Crear alumno</p>
                <input
                  value={createUsername}
                  onChange={(event) => setCreateUsername(event.target.value)}
                  placeholder="Usuario visible, por ejemplo opo1"
                  className="w-full rounded-[1rem] border border-white/85 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                />
                <input
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  placeholder="Contrasena inicial"
                  type="text"
                  className="w-full rounded-[1rem] border border-white/85 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                />
                <select
                  value={createPlayerMode}
                  onChange={(event) => setCreatePlayerMode(event.target.value as AccountPlayerMode)}
                  className="w-full rounded-[1rem] border border-white/85 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                >
                  <option value="advanced">Modo avanzado</option>
                  <option value="generic">Modo generico</option>
                </select>
                <button
                  type="submit"
                  disabled={creating || !createUsername.trim() || !createPassword.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-white/70 quantia-bg-gradient px-4 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_30px_-20px_rgba(141,147,242,0.26)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
                >
                  {creating ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  Crear usuario
                </button>
              </form>

              <div className="mt-3 flex gap-2">
                <label className="relative flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar usuario o id"
                    className="w-full rounded-[1rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.88))] py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void loadUsers(search)}
                  className="rounded-[1rem] border border-white/80 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd2f6] hover:bg-sky-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.99]"
                >
                  Buscar
                </button>
              </div>
            </AdminDisclosure>
          </div>

          {error ? (
            <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {notice}
            </div>
          ) : null}

          <div ref={userListRef} className="mt-4 max-h-[40rem] space-y-3 overflow-auto pr-1">
            {loadingUsers ? (
              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.9))] px-4 py-6 text-center text-sm font-semibold text-slate-500">
                Cargando usuarios...
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.9))] px-4 py-6 text-center text-sm font-semibold text-slate-500">
                No hay usuarios para mostrar.
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Mostrando {visibleUsers.length} de {users.length}
                </p>
                {visibleUsers.map((entry) => (
                  <AdminUserListItem
                    key={entry.user_id}
                    entry={entry}
                    isSelected={selectedUserId === entry.user_id}
                    onSelect={handleSelectUser}
                  />
                ))}
                {hasMoreUsers ? (
                  <div
                    ref={userLoadMoreSentinelRef}
                    className="flex flex-col items-center gap-2 rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.9))] px-4 py-3 text-center shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Quedan {remainingUsers} usuarios
                    </p>
                    <button
                      type="button"
                      onClick={loadMoreUsers}
                      className="rounded-full border border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.18))] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-800 shadow-[0_12px_24px_-20px_rgba(141,147,242,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(141,147,242,0.22))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98]"
                    >
                      Cargar {Math.min(ADMIN_USERS_RENDER_STEP, remainingUsers)} mas
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </AdminSurface>

        <AdminSurface>
          {!selectedUser ? (
            <EmptyState>Selecciona un alumno para ver su actividad.</EmptyState>
          ) : loadingDetail ? (
            <EmptyState>
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={18} className="animate-spin" />
                Cargando detalle...
              </span>
            </EmptyState>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[1.4rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-4 text-white shadow-[0_28px_72px_-42px_rgba(141,147,242,0.28)]">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/16 blur-3xl" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
                </div>
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-50/84">
                      Alumno
                    </p>
                    <h3 className="mt-1.5 truncate text-[1.55rem] font-black tracking-[-0.02em] text-white sm:text-[1.85rem]">
                      {selectedUser.current_username ?? selectedUser.user_id}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-sky-50/88">
                      <p>
                        Acceso real: {selectedUser.current_username ?? 'sin usuario'} + contrasena
                      </p>
                      <p>Ultimo acceso: {formatDate(selectedUser.last_sign_in_at)}</p>
                      <p>
                        Ultimo estudio:{' '}
                        {formatDate(profile?.last_studied_at ?? selectedUser.last_studied_at)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/12 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/86 backdrop-blur-sm">
                    {selectedUser.is_admin
                      ? 'Admin'
                      : `Alumno ${formatPlayerModeLabel(selectedUser.player_mode)}`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AdminCompactMetric
                  label="Precision"
                  value={`${profile?.accuracy ?? selectedUser.accuracy}%`}
                />
                <AdminCompactMetric
                  label="Sesiones"
                  value={String(profile?.total_sessions ?? selectedUser.total_sessions)}
                />
                <AdminCompactMetric
                  label="Respondidas"
                  value={String(profile?.total_answered ?? selectedUser.total_answered)}
                />
                <AdminCompactMetric label="Siguiente" value={String(nextBatchNumber)} />
              </div>

              <AdminDisclosure
                title="Acceso y modo"
                hint="Editar nombre de acceso, contrasena y nivel de interfaz."
                defaultOpen
              >
                {selectedUser.is_admin ? (
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    Las cuentas admin no se editan desde este panel.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <form
                      onSubmit={handleSetPlayerMode}
                      className="rounded-[1.15rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] p-4 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]"
                    >
                      <div className="flex items-center gap-2">
                        <Layers3 size={16} className="text-sky-600" />
                        <p className="text-sm font-extrabold text-slate-950">Modo de alumno</p>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        Generico reduce menus y mensajes. Avanzado mantiene el panel completo.
                      </p>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <select
                          value={editPlayerMode}
                          onChange={(event) =>
                            setEditPlayerMode(event.target.value as AccountPlayerMode)
                          }
                          className="w-full rounded-[1rem] border border-white/85 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                        >
                          <option value="advanced">Modo avanzado</option>
                          <option value="generic">Modo generico</option>
                        </select>
                        <button
                          type="submit"
                          disabled={savingPlayerMode || editPlayerMode === selectedUser.player_mode}
                          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[1rem] border border-white/70 quantia-bg-gradient px-4 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_30px_-20px_rgba(141,147,242,0.26)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
                        >
                          {savingPlayerMode ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Layers3 size={16} />
                          )}
                          Guardar modo
                        </button>
                      </div>
                    </form>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <form
                        onSubmit={handleChangeUsername}
                        className="rounded-[1.15rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] p-4 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]"
                      >
                        <div className="flex items-center gap-2">
                          <PencilLine size={16} className="text-sky-600" />
                          <p className="text-sm font-extrabold text-slate-950">Cambiar usuario</p>
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                          Este sera el nombre que el alumno use para entrar en la app.
                        </p>
                        <input
                          value={editUsername}
                          onChange={(event) => setEditUsername(event.target.value)}
                          placeholder="Nuevo usuario"
                          className="mt-3 w-full rounded-[1rem] border border-white/85 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                        />
                        <button
                          type="submit"
                          disabled={
                            savingUsername ||
                            !editUsername.trim() ||
                            editUsername.trim() === (selectedUser.current_username ?? '')
                          }
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-white/70 quantia-bg-gradient px-4 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_30px_-20px_rgba(141,147,242,0.26)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
                        >
                          {savingUsername ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <PencilLine size={16} />
                          )}
                          Guardar usuario
                        </button>
                      </form>

                      <form
                        onSubmit={handleSetPassword}
                        className="rounded-[1.15rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] p-4 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)]"
                      >
                        <div className="flex items-center gap-2">
                          <KeyRound size={16} className="text-sky-600" />
                          <p className="text-sm font-extrabold text-slate-950">
                            Cambiar contrasena
                          </p>
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                          La contrasena se aplica al mismo acceso por usuario.
                        </p>
                        <input
                          value={editPassword}
                          onChange={(event) => setEditPassword(event.target.value)}
                          placeholder="Nueva contrasena"
                          type="password"
                          className="mt-3 w-full rounded-[1rem] border border-white/85 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                        />
                        <button
                          type="submit"
                          disabled={savingPassword || !editPassword.trim()}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-white/70 quantia-bg-gradient px-4 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_30px_-20px_rgba(141,147,242,0.26)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
                        >
                          {savingPassword ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <KeyRound size={16} />
                          )}
                          Guardar contrasena
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </AdminDisclosure>

              <AdminDisclosure
                title="Actividad y acciones"
                hint="Sesiones recientes y operaciones sobre la cuenta."
                defaultOpen
              >
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!selectedUser.is_admin ? (
                    <button
                      type="button"
                      onClick={handleResetPracticeProgress}
                      disabled={resettingProgress}
                      className="inline-flex items-center gap-2 rounded-[0.95rem] border border-amber-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,235,0.96))] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700 shadow-[0_14px_28px_-24px_rgba(245,158,11,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,247,225,0.98))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
                    >
                      {resettingProgress ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      Reiniciar estadisticas
                    </button>
                  ) : null}
                  {!selectedUser.is_admin ? (
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-[0.95rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,245,247,0.94))] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-700 shadow-[0_14px_28px_-24px_rgba(244,114,182,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,242,246,0.96))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
                    >
                      {deleting ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Borrar cuenta
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 space-y-3">
                  {recentSessions.length === 0 ? (
                    <p className="text-sm text-slate-500">Todavia no hay sesiones registradas.</p>
                  ) : (
                    visibleRecentSessions.map((session) => (
                      <AdminRecentSessionCard key={session.id} session={session} />
                    ))
                  )}
                </div>
              </AdminDisclosure>

              <AdminDisclosure
                title="Preguntas mas falladas"
                hint="Se despliega solo cuando quieres inspeccionar errores."
              >
                <div className="space-y-3">
                  {weakQuestions.length === 0 ? (
                    <p className="text-sm text-slate-500">Todavia no hay errores acumulados.</p>
                  ) : (
                    visibleWeakQuestions.map((question, index) => (
                      <AdminWeakQuestionCard
                        key={`${question.question_id}-${index}`}
                        question={question}
                      />
                    ))
                  )}
                </div>
              </AdminDisclosure>

              <AdminDisclosure
                title="Observabilidad local"
                hint="Resumen vivo de telemetria del navegador para perfilar pantallas y errores."
              >
                <AdminTelemetryPanel />
              </AdminDisclosure>
            </div>
          )}
        </AdminSurface>
      </div>
    </ScreenTelemetryBoundary>
  );
};

export default AdminConsoleScreen;
