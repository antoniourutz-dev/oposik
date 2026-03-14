import React from 'react';

type ConfigurationErrorScreenProps = {
  missingVars: string[];
};

const ConfigurationErrorScreen: React.FC<ConfigurationErrorScreenProps> = React.memo(({ missingVars }) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.2),transparent_28%),linear-gradient(180deg,#fff7ed_0%,#fff1f2_46%,#ffffff_100%)] px-4 py-8">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-amber-200 bg-white shadow-[0_30px_80px_-35px_rgba(120,53,15,0.35)]">
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-5">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">
            Configuracion pendiente
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Faltan variables de entorno de Supabase
          </h1>
        </div>

        <div className="space-y-5 px-6 py-6 text-slate-700">
          <p className="text-sm font-medium leading-relaxed">
            La aplicacion no puede arrancar correctamente porque el build no recibio la configuracion publica
            de Supabase.
          </p>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 px-5 py-4 text-sm text-slate-100">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              Variables requeridas
            </p>
            <ul className="mt-3 space-y-2 font-mono text-sm">
              {missingVars.map((variableName) => (
                <li key={variableName}>{variableName}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50 px-5 py-4">
            <p className="text-sm font-bold text-sky-900">
              En Vercel tienes que definirlas en Project Settings &gt; Environment Variables y volver a desplegar.
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-sky-800">
              Si quieres probar en local, crea tambien un archivo <code>.env.local</code> con esos mismos valores.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
});

ConfigurationErrorScreen.displayName = 'ConfigurationErrorScreen';

export default ConfigurationErrorScreen;
