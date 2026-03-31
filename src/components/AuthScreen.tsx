import React, { useState } from 'react';
import { Compass, Eye, EyeOff, Lock, Sparkles, UserRound, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_DISPLAY_NAME } from '../appMeta';
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
  guestMaxBlocks,
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
        loginError instanceof Error ? loginError.message : 'No se ha podido iniciar sesion.',
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
        guestError instanceof Error
          ? guestError.message
          : 'No se ha podido abrir el acceso invitado.',
      );
    } finally {
      setGuestSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 font-outfitSelection">
      {/* 🎭 FONDO CINEMÁTICO MESH GRADIENT */}
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(circle_at_top_right,rgba(124,182,232,0.15),transparent_40%),radial-gradient(circle_at_top_left,rgba(141,147,242,0.12),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(15,23,42,1),rgba(15,23,42,0.95))]" />

      {/* 🔮 ELEMENTOS FLOTANTES GLASS */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-20 top-20 h-64 w-64 rounded-full border border-white/5 bg-white/5 backdrop-blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 30, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-20 bottom-40 h-80 w-80 rounded-full border border-white/5 bg-white/5 backdrop-blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-lg items-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          {/* LOGO AREA */}
          <div className="flex flex-col items-center text-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2.2rem] bg-white text-slate-950 shadow-[0_32px_64px_-16px_rgba(255,255,255,0.2)]"
            >
              <span className="text-3xl font-black italic tracking-tighter">Q</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                {APP_DISPLAY_NAME}
              </h1>
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.3em] text-indigo-300/60">
                Data-Driven Excellence
              </p>
            </motion.div>
          </div>

          <div className="overflow-hidden rounded-[2.8rem] border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-3xl">
            <div className="rounded-[2.4rem] bg-white p-7 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${
                      mode === 'member' ? 'bg-slate-950' : 'bg-indigo-500'
                    }`}
                  >
                    {mode === 'member' ? <UserRound size={20} /> : <Compass size={20} />}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 tracking-tight">
                      {mode === 'member' ? 'Acceso Alumno' : 'Acceso Invitado'}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Portal oficial v2.4
                    </p>
                  </div>
                </div>

                <div className="flex gap-1 rounded-2xl bg-slate-50 p-1 border border-slate-100">
                  <button
                    onClick={() => setMode('member')}
                    className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'member' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400'}`}
                  >
                    Alumno
                  </button>
                  <button
                    onClick={() => setMode('guest')}
                    className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'guest' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400'}`}
                  >
                    Invitado
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {mode === 'member' ? (
                  <motion.div
                    key="member"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 ml-1">
                          Identificador
                        </span>
                        <div className="group relative">
                          <UserRound
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 transition-colors"
                          />
                          <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ej: opo1"
                            className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-slate-950 focus:bg-white transition-all ring-offset-2 focus:ring-2 ring-slate-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 ml-1">
                          Contraseña
                        </span>
                        <div className="group relative">
                          <Lock
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 transition-colors"
                          />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-14 text-sm font-bold tracking-[0.2em] text-slate-900 outline-none focus:border-slate-950 focus:bg-white transition-all ring-offset-2 focus:ring-2 ring-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-950 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-[13px] font-bold text-rose-600"
                        >
                          {error}
                        </motion.div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="group relative w-full h-16 rounded-[1.4rem] bg-slate-950 px-6 font-black uppercase tracking-[0.18em] text-white shadow-xl transition-all hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative flex items-center justify-center gap-2">
                          {submitting ? 'Desbloqueando...' : 'Acceder al centro'}
                          <ArrowRight size={18} />
                        </span>
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="guest"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                          Invitación de cortesía
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed">
                        Prueba la experiencia de examen real hoy. Tienes{' '}
                        <span className="text-indigo-600 font-extrabold">
                          {guestBlocksRemaining} bloques
                        </span>{' '}
                        disponibles sin registro.
                      </p>
                    </div>

                    <button
                      onClick={handleGuestEnter}
                      disabled={guestAccessExhausted || guestSubmitting}
                      className="group w-full h-16 rounded-[1.4rem] bg-indigo-600 px-6 font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {guestSubmitting ? 'Cargando Pruebas...' : 'Iniciar Tour Invitado'}
                        <ArrowRight size={18} />
                      </span>
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      El progreso de invitados no es persistente
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-6 flex justify-center gap-2 items-center">
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Protección SSL Nivel Bancario Activa
              </p>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-10 text-center text-xs font-bold text-slate-500 uppercase tracking-[0.1em]"
          >
            © 2026 OPOSIK DIGITAL SYSTEMS. ALL RIGHTS RESERVED.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthScreen;
