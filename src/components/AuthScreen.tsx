import React, { useState } from 'react';
import { Eye, EyeOff, Lock, UserRound } from 'lucide-react';
import { loginWithUsername } from '../services/authApi';

type AuthScreenProps = {
  onSignedIn: () => Promise<void> | void;
};

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password.trim()) {
      setError('Introduce tu usuario y tu contraseña.');
      return;
    }

    setSubmitting(true);

    try {
      await loginWithUsername(normalizedUsername, password);
      await onSignedIn();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se ha podido iniciar sesion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-8">
      <div className="w-full rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(15,23,42,0.42)] backdrop-blur sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.6)]">
            <UserRound size={24} />
          </div>
          <div>
            <p className="text-lg font-black text-slate-950">Oposik</p>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">
              Acceso alumno
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-black text-slate-950">Entra con tu usuario</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            El alumno solo usa su codigo, por ejemplo <strong className="font-black text-slate-900">opo1</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              Usuario
            </span>
            <div className="relative">
              <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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
              Contraseña
            </span>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
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
      </div>
    </div>
  );
};

export default AuthScreen;
