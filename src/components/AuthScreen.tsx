import React, { useState } from 'react';
import { Compass, Eye, EyeOff, Lock, Sparkles, UserRound } from 'lucide-react';
import { loginWithUsername } from '../services/authApi';

type AuthScreenProps = {
  onSignedIn: () => Promise<void> | void;
  onEnterGuest: () => Promise<void> | void;
  guestBlocksRemaining: number;
  guestMaxBlocks: number;
};

type AuthMode = 'member' | 'guest';

const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignedIn,
  onEnterGuest,
  guestBlocksRemaining,
  guestMaxBlocks
}) => {
  const [mode, setMode] = useState<AuthMode>('member');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guestAccessExhausted = guestBlocksRemaining <= 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password.trim()) {
      setError('Introduce tu usuario y tu contrasena.');
      return;
    }

    setSubmitting(true);

    try {
      await loginWithUsername(normalizedUsername, password);
      await onSignedIn();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'No se ha podido iniciar sesion.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestEnter = async () => {
    setError(null);
    setGuestSubmitting(true);

    try {
      await onEnterGuest();
    } catch (guestError) {
      setError(
        guestError instanceof Error ? guestError.message : 'No se ha podido abrir el acceso invitado.'
      );
    } finally {
      setGuestSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(121,182,233,0.16),transparent_28%),linear-gradient(180deg,#f7faff_0%,#edf3ff_38%,#f7f9fc_100%)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-8">
        <div className="w-full rounded-[2rem] border border-white/78 bg-white/90 p-5 shadow-[0_36px_90px_-48px_rgba(15,23,42,0.38)] backdrop-blur sm:p-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-[1.35rem] text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] ${
                mode === 'member'
                  ? 'bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)]'
                  : 'bg-[linear-gradient(135deg,#79b6e9_0%,#8d93f2_100%)]'
              }`}
            >
              {mode === 'member' ? <UserRound size={24} /> : <Compass size={24} />}
            </div>
            <div>
              <p className="text-lg font-black text-slate-950">Oposik</p>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {mode === 'member' ? 'Acceso alumno' : 'Acceso invitado'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50/90 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('member');
                setError(null);
              }}
              className={`rounded-[0.95rem] px-3 py-2 text-sm font-extrabold transition-all duration-200 ${
                mode === 'member'
                  ? 'bg-white text-slate-950 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.24)]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Alumno
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('guest');
                setError(null);
              }}
              className={`rounded-[0.95rem] px-3 py-2 text-sm font-extrabold transition-all duration-200 ${
                mode === 'guest'
                  ? 'bg-white text-slate-950 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.24)]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Invitado
            </button>
          </div>

          {mode === 'member' ? (
            <>
              <div className="mt-6">
                <h1 className="text-[2rem] font-black leading-[0.96] tracking-[-0.05em] text-slate-950">
                  Entra con tu usuario
                </h1>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  El alumno entra con su codigo, por ejemplo{' '}
                  <strong className="font-black text-slate-900">opo1</strong>.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Usuario
                  </span>
                  <div className="relative">
                    <UserRound
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        setError(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="opo1"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-sky-400"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Contrasena
                  </span>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                      }}
                      placeholder="********"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm font-bold tracking-[0.18em] text-slate-800 outline-none transition-colors focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {error ? (
                  <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center rounded-[1.2rem] bg-slate-950 px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </>
          ) : (
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100/80 bg-[linear-gradient(135deg,rgba(125,211,252,0.1),rgba(165,180,252,0.12))] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-700">
                <Sparkles size={13} className="text-sky-400" />
                Modo de prueba
              </div>

              <h1 className="mt-4 text-[2rem] font-black leading-[0.96] tracking-[-0.05em] text-slate-950">
                Entra como invitado
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                Acceso simple para ver la experiencia real: dos bloques aleatorios del temario
                comun y revision al terminar. Nada de stats, estudio o perfil.
              </p>

              <div className="mt-5 rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,255,0.96),rgba(240,246,255,0.94))] p-4 shadow-[0_18px_36px_-30px_rgba(141,147,242,0.2)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  {guestAccessExhausted
                    ? 'Prueba agotada'
                    : `${guestBlocksRemaining} de ${guestMaxBlocks} bloques disponibles`}
                </p>
                <p className="mt-2 text-lg font-black leading-tight text-slate-950">
                  {guestAccessExhausted
                    ? 'Este dispositivo ya ha consumido el acceso invitado.'
                    : 'Abriras directamente un bloque de 20 preguntas.'}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {guestAccessExhausted
                    ? 'Para seguir usando la app hace falta entrar con tu usuario.'
                    : 'La revision completa sigue activa, pero el progreso no se guarda.'}
                </p>

                {error ? (
                  <div className="mt-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleGuestEnter()}
                  disabled={guestAccessExhausted || guestSubmitting}
                  className="mt-4 flex w-full items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_34px_-24px_rgba(141,147,242,0.34)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {guestSubmitting ? 'Abriendo...' : 'Continuar como invitado'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
