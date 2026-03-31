# Oposik Supabase Bootstrap

Proyecto objetivo: `gmwgwttwzkgyljevddul`

## 1. Relink del CLI

Este repo sigue enlazado localmente a otro proyecto. Antes de empujar nada:

```bash
npx supabase link --project-ref gmwgwttwzkgyljevddul
```

## 2. Exponer el schema `app`

Haz una de estas dos cosas:

```bash
npx supabase config push
```

O en el Dashboard de Supabase:

- `Project Settings`
- `API`
- `Exposed schemas`
- añade `app`

## 3. Aplicar migraciones

```bash
npx supabase db push
```

Esto debe dejar disponibles, entre otras, estas piezas:

- `app.get_my_account_identity()`
- `app.get_my_practice_profile()`
- `app.record_practice_session(...)`
- `app.admin_list_users(...)`
- tablas `app.practice_profiles`, `app.practice_sessions`, `app.practice_attempts`, `app.practice_question_stats`

## 4. Desplegar funciones Edge

```bash
npx supabase functions deploy login-with-username --no-verify-jwt
npx supabase functions deploy admin-user-management
```

## 5. Crear el primer admin en Auth

En el Dashboard:

- `Authentication`
- `Users`
- `Add user`

Crea este usuario:

- email: `admin@oposik.app`
- password: la que quieras usar para entrar en Oposik

El alumno no verá ese email. En la app entrará solo con `admin`.

## 6. Promocionar ese usuario a admin funcional

Ejecuta en el SQL Editor este archivo:

- [20260327_bootstrap_oposik_admin.sql](/c:/Users/galle/Documents/GitHub/Oposikapp/supabase/sql/20260327_bootstrap_oposik_admin.sql)

Ese script:

- asegura `app.user_profiles`
- fija `admin` como username visible
- añade el rol `admin`
- sincroniza el metadata del usuario

## 7. Verificación rápida

La función de login debe dejar de devolver `404`:

```bash
curl -i https://gmwgwttwzkgyljevddul.supabase.co/functions/v1/login-with-username
```

Y la app debería poder iniciar sesión con:

- usuario: `admin`
- contraseña: la definida en `admin@oposik.app`

## 8. Después del primer admin

Una vez dentro de Oposik:

- entra con `admin`
- abre `Perfil`
- usa el panel de administración para crear alumnos como `opo1`, `opo2`, etc.

Internamente sus cuentas serán:

- `opo1@oposik.app`
- `opo2@oposik.app`

Pero en la app solo usarán su código corto.
