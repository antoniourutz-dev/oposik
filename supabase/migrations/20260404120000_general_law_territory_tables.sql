begin;

-- Territorios de entrenamiento (ley + bloques), no catálogo documental pasivo.
-- Las preguntas siguen en public.preguntas; la práctica pivot por curriculum_key = leyes_generales.

create table if not exists app.general_laws (
  id uuid primary key default gen_random_uuid(),
  law_key text not null,
  curriculum_key text not null default 'leyes_generales'
    check (curriculum_key = 'leyes_generales'),
  title text not null,
  short_title text not null,
  legal_reference_label text not null,
  sort_order integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  published_at timestamptz,
  min_questions_to_publish integer not null default 30
    check (min_questions_to_publish >= 1),
  training_intent text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (law_key)
);

create index if not exists idx_general_laws_curriculum_sort
  on app.general_laws (curriculum_key, sort_order);

create table if not exists app.general_law_blocks (
  id uuid primary key default gen_random_uuid(),
  law_id uuid not null references app.general_laws (id) on delete cascade,
  parent_block_id uuid references app.general_law_blocks (id) on delete cascade,
  block_key text not null,
  title text not null,
  sort_order integer not null default 0,
  depth smallint not null default 0 check (depth between 0 and 2),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  min_questions_for_training integer not null default 8
    check (min_questions_for_training >= 1),
  training_focus text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (law_id, block_key)
);

create index if not exists idx_general_law_blocks_law_sort
  on app.general_law_blocks (law_id, sort_order);

-- Extensión del catálogo de preguntas: anclas territoriales + clasificación para decisión.
-- subject_key es opcional en fase 1 (no obligatorio en constraints).
alter table public.preguntas
  add column if not exists curriculum_key text,
  add column if not exists general_law_id uuid references app.general_laws (id),
  add column if not exists general_law_block_id uuid references app.general_law_blocks (id),
  add column if not exists question_scope_key text
    check (question_scope_key is null or question_scope_key in ('common', 'specific', 'mixed')),
  add column if not exists subject_key text,
  add column if not exists difficulty smallint check (difficulty is null or difficulty between 1 and 5),
  add column if not exists general_law_question_type text,
  add column if not exists dominant_trap_type text;

alter table public.preguntas
  drop constraint if exists preguntas_general_law_territory_chk;

alter table public.preguntas
  add constraint preguntas_general_law_territory_chk check (
    curriculum_key is distinct from 'leyes_generales'
    or curriculum_key is null
    or (
      general_law_id is not null
      and general_law_block_id is not null
      and coalesce(trim(question_scope_key), '') <> ''
    )
  );

alter table public.preguntas
  drop constraint if exists preguntas_general_law_block_matches_law_chk;

alter table app.general_law_blocks
  drop constraint if exists general_law_blocks_parent_same_law;

create or replace function app.ensure_general_law_block_parent_same_law()
returns trigger
language plpgsql
as $$
begin
  if new.parent_block_id is not null
    and not exists (
      select 1
      from app.general_law_blocks parent_block
      where parent_block.id = new.parent_block_id
        and parent_block.law_id = new.law_id
    ) then
    raise exception 'general_law_blocks.parent_block_id must belong to the same law'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_general_law_blocks_parent_same_law on app.general_law_blocks;
create trigger trg_general_law_blocks_parent_same_law
before insert or update of law_id, parent_block_id
on app.general_law_blocks
for each row
execute function app.ensure_general_law_block_parent_same_law();

create or replace function app.ensure_pregunta_general_law_block_matches_law()
returns trigger
language plpgsql
as $$
begin
  if new.general_law_id is not null
    and new.general_law_block_id is not null
    and not exists (
      select 1
      from app.general_law_blocks block_row
      where block_row.id = new.general_law_block_id
        and block_row.law_id = new.general_law_id
    ) then
    raise exception 'preguntas.general_law_block_id must belong to general_law_id'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_preguntas_general_law_block_matches_law on public.preguntas;
create trigger trg_preguntas_general_law_block_matches_law
before insert or update of general_law_id, general_law_block_id
on public.preguntas
for each row
execute function app.ensure_pregunta_general_law_block_matches_law();

create index if not exists idx_preguntas_curriculum_law
  on public.preguntas (curriculum_key, general_law_id)
  where curriculum_key = 'leyes_generales';

create index if not exists idx_preguntas_curriculum_block
  on public.preguntas (curriculum_key, general_law_block_id)
  where curriculum_key = 'leyes_generales';

alter table app.general_laws enable row level security;
alter table app.general_law_blocks enable row level security;

drop policy if exists "general_laws_select_all" on app.general_laws;
create policy "general_laws_select_all" on app.general_laws for select using (true);

drop policy if exists "general_law_blocks_select_all" on app.general_law_blocks;
create policy "general_law_blocks_select_all" on app.general_law_blocks for select using (true);

grant select on app.general_laws to anon, authenticated;
grant select on app.general_law_blocks to anon, authenticated;

commit;
