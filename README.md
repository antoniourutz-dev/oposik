# KORRIKA PWA

KORRIKA erronkarako galdetegi web aplikazioa.

## Baldintzak

- Node.js 20+

## Konfigurazioa

Sortu `.env.local` fitxategia:

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Aldagaiak zehazten ez badituzu, proiektuak lehenetsitako balioak erabiliko ditu.

## Exekutatu

```bash
npm install
npm run dev
```

## Ekoizpeneko build-a

```bash
npm run build
npm run preview
```

## Supabase deployment

Username editable flow and Supabase artifacts live under `supabase/`.

```bash
copy .env.supabase.example .env.supabase
npm run supabase:login
npm run supabase:link
npm run supabase:config:push
npm run supabase:db:push
npm run supabase:functions:deploy:login
npm run rotate:internal-auth-emails
```

Notes:

- Add `app` to exposed schemas before using the frontend account APIs.
- `supabase/config.toml` already includes `api.schemas = ["public", "storage", "graphql_public", "app"]`, so `npm run supabase:config:push` should expose `app` remotely.
- `npm run supabase:deploy:username-auth` chains DB push and function deploy.
- The rotation script needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your environment.
- In local `vite` development, the app now uses a legacy login fallback if `login-with-username` is not deployed yet. Keep that fallback only as a transition path.
