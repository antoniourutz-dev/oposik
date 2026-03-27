begin;

create or replace function app.get_readiness_dashboard(
  p_curriculum text default 'general'
)
returns table (
  total_questions integer,
  seen_questions integer,
  readiness numeric,
  readiness_lower numeric,
  readiness_upper numeric,
  projected_readiness numeric,
  overdue_count integer,
  backlog_count integer,
  fragile_count integer,
  consolidating_count integer,
  solid_count integer,
  mastered_count integer,
  new_count integer,
  recommended_review_count integer,
  recommended_new_count integer,
  recommended_today_count integer,
  recommended_mode text,
  focus_message text,
  daily_review_capacity integer,
  daily_new_capacity integer,
  exam_date date,
  risk_breakdown jsonb
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform app.ensure_exam_target(v_user_id, v_curriculum);

  return query
  with target as (
    select
      et.exam_date,
      et.daily_review_capacity,
      et.daily_new_capacity,
      case
        when et.exam_date is null then null::numeric
        else greatest(0, (et.exam_date - timezone('utc', now())::date))::numeric
      end as days_to_exam
    from app.exam_targets et
    where et.user_id = v_user_id
      and et.curriculum = v_curriculum
    limit 1
  ),
  catalog as (
    select count(*)::integer as total_questions
    from public.preguntas p
    where coalesce(to_jsonb(p)->>'id', '') <> ''
  ),
  state_metrics as (
    select
      count(*)::integer as seen_questions,
      count(*) filter (
        where qs.next_review_at is not null
          and qs.next_review_at <= timezone('utc', now())
      )::integer as overdue_count,
      count(*) filter (where qs.mastery_level <= 1)::integer as fragile_count,
      count(*) filter (where qs.mastery_level = 2)::integer as consolidating_count,
      count(*) filter (where qs.mastery_level = 3)::integer as solid_count,
      count(*) filter (where qs.mastery_level >= 4)::integer as mastered_count,
      coalesce(
        sum(
          app.project_exam_retention_probability(
            qs.p_correct_estimated,
            qs.stability_score,
            target.days_to_exam
          )
        ),
        0::numeric
      ) as readiness_sum
    from app.user_question_state qs
    cross join target
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
  ),
  risk_summary as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'error_type', risk.error_type,
          'label',
            case risk.error_type
              when 'plazo' then 'Plazos'
              when 'excepcion' then 'Excepciones'
              when 'negacion' then 'Negaciones'
              when 'literalidad' then 'Literalidad'
              when 'organo_competente' then 'Organos'
              when 'distractor_cercano' then 'Distractores'
              when 'sobreconfianza' then 'Sobreconfianza'
              when 'lectura_rapida' then 'Lectura rapida'
              when 'confusion_entre_normas' then 'Normas'
              when 'procedimiento' then 'Procedimiento'
              when 'concepto' then 'Conceptos'
              when 'memoria_fragil' then 'Memoria fragil'
              else initcap(replace(risk.error_type, '_', ' '))
            end,
          'count', risk.risk_count
        )
        order by risk.risk_count desc, risk.error_type
      ),
      '[]'::jsonb
    ) as risk_breakdown
    from (
      select
        qs.dominant_error_type as error_type,
        count(*)::integer as risk_count
      from app.user_question_state qs
      where qs.user_id = v_user_id
        and qs.curriculum = v_curriculum
        and qs.dominant_error_type is not null
        and qs.mastery_level <= 2
      group by qs.dominant_error_type
      order by risk_count desc, qs.dominant_error_type
      limit 3
    ) risk
  ),
  composed as (
    select
      catalog.total_questions,
      state_metrics.seen_questions,
      greatest(catalog.total_questions - state_metrics.seen_questions, 0) as new_count,
      state_metrics.overdue_count,
      state_metrics.fragile_count,
      state_metrics.consolidating_count,
      state_metrics.solid_count,
      state_metrics.mastered_count,
      target.daily_review_capacity,
      target.daily_new_capacity,
      target.exam_date,
      risk_summary.risk_breakdown,
      case
        when catalog.total_questions <= 0 then 0.25::numeric
        else (
          state_metrics.readiness_sum +
          (greatest(catalog.total_questions - state_metrics.seen_questions, 0)::numeric * 0.25::numeric)
        ) / catalog.total_questions::numeric
      end as readiness_value
    from catalog
    cross join state_metrics
    cross join target
    cross join risk_summary
  )
  select
    composed.total_questions,
    composed.seen_questions,
    round(composed.readiness_value, 4) as readiness,
    case
      when composed.total_questions >= 5
        then round(greatest(0::numeric, composed.readiness_value - least(0.08::numeric, 0.22::numeric / sqrt(composed.total_questions::numeric))), 4)
      else null
    end as readiness_lower,
    case
      when composed.total_questions >= 5
        then round(least(1::numeric, composed.readiness_value + least(0.08::numeric, 0.22::numeric / sqrt(composed.total_questions::numeric))), 4)
      else null
    end as readiness_upper,
    round(composed.readiness_value, 4) as projected_readiness,
    composed.overdue_count,
    composed.overdue_count as backlog_count,
    composed.fragile_count,
    composed.consolidating_count,
    composed.solid_count,
    composed.mastered_count,
    composed.new_count,
    case
      when composed.overdue_count > 0
        then least(composed.daily_review_capacity, composed.overdue_count)
      when composed.fragile_count > 0
        then least(composed.daily_review_capacity, composed.fragile_count)
      else 0
    end as recommended_review_count,
    case
      when composed.overdue_count >= composed.daily_review_capacity then 0
      else least(composed.daily_new_capacity, composed.new_count)
    end as recommended_new_count,
    (
      case
        when composed.overdue_count > 0
          then least(composed.daily_review_capacity, composed.overdue_count)
        when composed.fragile_count > 0
          then least(composed.daily_review_capacity, composed.fragile_count)
        else 0
      end
      +
      case
        when composed.overdue_count >= composed.daily_review_capacity then 0
        else least(composed.daily_new_capacity, composed.new_count)
      end
    ) as recommended_today_count,
    case
      when composed.overdue_count > 0 then 'mixed'
      when composed.fragile_count >= greatest(4, composed.daily_review_capacity / 2) then 'mixed'
      when composed.new_count > 0 then 'standard'
      else 'random'
    end as recommended_mode,
    case
      when composed.overdue_count > 0 then format(
        'Tienes %s preguntas urgentes. Hoy conviene priorizar %s.',
        composed.overdue_count,
        least(composed.daily_review_capacity, composed.overdue_count)
      )
      when composed.fragile_count > 0 then format(
        'Hoy conviene consolidar %s preguntas fragiles y abrir %s nuevas.',
        least(composed.daily_review_capacity, composed.fragile_count),
        least(composed.daily_new_capacity, composed.new_count)
      )
      when composed.new_count > 0 then format(
        'Puedes avanzar con %s nuevas sin perder el ritmo.',
        least(composed.daily_new_capacity, composed.new_count)
      )
      else 'Tu sistema esta estable. Puedes medirte con mezcla libre.'
    end as focus_message,
    composed.daily_review_capacity,
    composed.daily_new_capacity,
    composed.exam_date,
    composed.risk_breakdown
  from composed;
end;
$$;

create or replace function app.get_mixed_practice_batch(
  p_curriculum text default 'general',
  p_batch_size integer default 20
)
returns table (
  payload jsonb,
  source_bucket text
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 100));
  v_target_overdue integer := ceil(v_limit * 0.5)::integer;
  v_target_fragile integer := floor(v_limit * 0.2)::integer;
  v_target_new integer := floor(v_limit * 0.2)::integer;
  v_target_maintenance integer := greatest(0, v_limit - v_target_overdue - v_target_fragile - v_target_new);
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  with overdue as (
    select
      qs.question_id,
      'overdue'::text as bucket,
      1 as bucket_priority,
      row_number() over (
        order by qs.next_review_at asc nulls last, qs.exam_retention_probability asc, qs.p_correct_estimated asc
      ) as rn
    from app.user_question_state qs
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and qs.next_review_at is not null
      and qs.next_review_at <= timezone('utc', now())
  ),
  fragile as (
    select
      qs.question_id,
      'fragile'::text as bucket,
      2 as bucket_priority,
      row_number() over (
        order by qs.p_correct_estimated asc, qs.exam_retention_probability asc, qs.next_review_at asc nulls last
      ) as rn
    from app.user_question_state qs
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and qs.mastery_level <= 1
      and not exists (
        select 1
        from overdue o
        where o.question_id = qs.question_id
      )
  ),
  new_questions as (
    select
      coalesce(to_jsonb(p)->>'id', '') as question_id,
      'new'::text as bucket,
      3 as bucket_priority,
      row_number() over (
        order by
          case
            when trim(coalesce(to_jsonb(p)->>'numero', '')) ~ '^-?\d+$'
              then (to_jsonb(p)->>'numero')::integer
            else null
          end asc nulls last,
          coalesce(to_jsonb(p)->>'id', '')
      ) as rn
    from public.preguntas p
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and not exists (
        select 1
        from app.user_question_state qs
        where qs.user_id = v_user_id
          and qs.curriculum = v_curriculum
          and qs.question_id = coalesce(to_jsonb(p)->>'id', '')
      )
  ),
  maintenance as (
    select
      qs.question_id,
      'maintenance'::text as bucket,
      4 as bucket_priority,
      row_number() over (
        order by qs.exam_retention_probability asc, qs.p_correct_estimated asc, qs.next_review_at asc nulls last
      ) as rn
    from app.user_question_state qs
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and qs.mastery_level >= 2
      and not exists (
        select 1
        from overdue o
        where o.question_id = qs.question_id
      )
      and not exists (
        select 1
        from fragile f
        where f.question_id = qs.question_id
      )
  ),
  seed as (
    select question_id, bucket, bucket_priority, rn
    from overdue
    where rn <= v_target_overdue

    union all

    select question_id, bucket, bucket_priority, rn
    from fragile
    where rn <= v_target_fragile

    union all

    select question_id, bucket, bucket_priority, rn
    from new_questions
    where rn <= v_target_new

    union all

    select question_id, bucket, bucket_priority, rn
    from maintenance
    where rn <= v_target_maintenance
  ),
  all_candidates as (
    select question_id, bucket, bucket_priority, rn from overdue
    union all
    select question_id, bucket, bucket_priority, rn from fragile
    union all
    select question_id, bucket, bucket_priority, rn from new_questions
    union all
    select question_id, bucket, bucket_priority, rn from maintenance
  ),
  fill as (
    select
      ac.question_id,
      ac.bucket,
      ac.bucket_priority,
      row_number() over (order by ac.bucket_priority asc, ac.rn asc) as fill_rn
    from all_candidates ac
    where not exists (
      select 1
      from seed s
      where s.question_id = ac.question_id
    )
  ),
  final_selection as (
    select
      s.question_id,
      s.bucket,
      s.bucket_priority,
      s.rn as ordering
    from seed s

    union all

    select
      f.question_id,
      f.bucket,
      f.bucket_priority,
      1000 + f.fill_rn as ordering
    from fill f
    where f.fill_rn <= greatest(v_limit - (select count(*) from seed), 0)
  )
  select
    to_jsonb(p) as payload,
    fs.bucket as source_bucket
  from final_selection fs
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = fs.question_id
  order by fs.ordering
  limit v_limit;
end;
$$;

grant execute on function app.get_readiness_dashboard(text) to authenticated;
grant execute on function app.get_mixed_practice_batch(text, integer) to authenticated;

commit;
