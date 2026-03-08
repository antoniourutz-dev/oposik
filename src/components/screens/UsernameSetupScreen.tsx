import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { changeMyUsername } from '../../services/accountApi';

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])?$/;

const UsernameSetupScreen: React.FC = React.memo(() => {
    const { accountIdentity, fetchAccountIdentity } = useAppStore();
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isValid = USERNAME_RE.test(inputValue.trim().toLowerCase());

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || loading) return;

        setLoading(true);
        setError(null);

        try {
            await changeMyUsername(inputValue);
            // Tras cambiar con éxito, recargamos la identidad para que actualice el historial
            await fetchAccountIdentity();
        } catch (err: any) {
            setError(err.message || 'Ezin izan da erabiltzaile izena gorde.');
            setLoading(false);
        }
    }, [inputValue, isValid, loading, fetchAccountIdentity]);

    return (
        <div className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 min-h-screen">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full glassmorphism rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden text-center shadow-xl"
            >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="w-20 h-20 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-pink-200 relative z-10">
                    <User className="w-10 h-10 text-pink-500" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black italic text-slate-800 tracking-tight mb-2 relative z-10">
                    Ongi etorri KORRIKAra!
                </h2>

                <p className="text-sm font-medium text-slate-600 mb-6 relative z-10 leading-relaxed">
                    Lehenengo aldia da hemen zaudela. Zure lehenetsitako izena <strong className="text-pink-600">{accountIdentity?.current_username}</strong> da.
                    Mundu guztiak ikusiko zaituen izena aukeratu behar duzu orain.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
                    <div className="relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value.toLowerCase())}
                            placeholder="Sartu zure erabiltzaile izen berria..."
                            className="w-full bg-white/80 border-2 border-slate-200 text-slate-800 px-5 py-4 rounded-2xl font-bold text-center outline-none focus:border-pink-500 transition-colors shadow-inner"
                            disabled={loading}
                            maxLength={32}
                        />
                        {inputValue.length > 0 && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {isValid ? (
                                    <CheckCircle2 className="text-emerald-500" size={20} />
                                ) : (
                                    <AlertCircle className="text-rose-500" size={20} />
                                )}
                            </div>
                        )}
                    </div>

                    {!isValid && inputValue.length > 0 && (
                        <p className="text-[11px] font-bold text-rose-500">
                            Izena minuskula, zenbaki eta "_" formatuan egon behar da (3-32 karaktere).
                        </p>
                    )}

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold shadow-sm">
                            {error}
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: isValid && !loading ? 1.02 : 1 }}
                        whileTap={{ scale: isValid && !loading ? 0.98 : 1 }}
                        type="submit"
                        disabled={!isValid || loading}
                        className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${isValid && !loading
                                ? 'korrika-bg-gradient text-white hover:shadow-xl'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed hidden-shadow'
                            }`}
                    >
                        {loading ? 'Gordetzen...' : 'Hasi Jolasten'}
                        {!loading && <ArrowRight size={18} />}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
});

UsernameSetupScreen.displayName = 'UsernameSetupScreen';
export default UsernameSetupScreen;
