begin;

create or replace function app.wilson_interval_low(
  p_successes integer,
  p_trials integer,
  p_z numeric default 1.96
)
returns numeric
language sql
immutable
as $$
  with normalized as (
    select
      greatest(coalesce(p_trials, 0), 0)::numeric as trials,
      greatest(
        0::numeric,
        least(greatest(coalesce(p_trials, 0), 0)::numeric, coalesce(p_successes, 0)::numeric)
      ) as successes,
      greatest(coalesce(p_z, 1.96), 0)::numeric as z
  )
  select
    case
      when trials <= 0 then null::numeric
      else greatest(
        0::numeric,
        (
          (
            (successes / trials) + ((z * z) / (2::numeric * trials))
          ) -
          (
            z * sqrt(
              (((successes / trials) * (1::numeric - (successes / trials))) / trials) +
              ((z * z) / (4::numeric * trials * trials))
            )
          )
        ) / (1::numeric + ((z * z) / trials))
      )
    end
  from normalized;
$$;

create or replace function app.wilson_interval_high(
  p_successes integer,
  p_trials integer,
  p_z numeric default 1.96
)
returns numeric
language sql
immutable
as $$
  with normalized as (
    select
      greatest(coalesce(p_trials, 0), 0)::numeric as trials,
      greatest(
        0::numeric,
        least(greatest(coalesce(p_trials, 0), 0)::numeric, coalesce(p_successes, 0)::numeric)
      ) as successes,
      greatest(coalesce(p_z, 1.96), 0)::numeric as z
  )
  select
    case
      when trials <= 0 then null::numeric
      else least(
        1::numeric,
        (
          (
            (successes / trials) + ((z * z) / (2::numeric * trials))
          ) +
          (
            z * sqrt(
              (((successes / trials) * (1::numeric - (successes / trials))) / trials) +
              ((z * z) / (4::numeric * trials * trials))
            )
          )
        ) / (1::numeric + ((z * z) / trials))
      )
    end
  from normalized;
$$;

create or replace function app.beta_smoothed_rate(
  p_successes numeric,
  p_trials numeric,
  p_alpha numeric,
  p_beta numeric
)
returns numeric
language sql
immutable
as $$
  with normalized as (
    select
      greatest(coalesce(p_trials, 0::numeric), 0::numeric) as trials,
      greatest(
        0::numeric,
        least(
          greatest(coalesce(p_trials, 0::numeric), 0::numeric),
          coalesce(p_successes, 0::numeric)
        )
      ) as successes,
      greatest(coalesce(p_alpha, 0::numeric), 0::numeric) as alpha,
      greatest(coalesce(p_beta, 0::numeric), 0::numeric) as beta
  )
  select
    case
      when (trials + alpha + beta) <= 0 then null::numeric
      else least(
        1::numeric,
        greatest(0::numeric, (successes + alpha) / (trials + alpha + beta))
      )
    end
  from normalized;
$$;

create or replace function app.resolve_confidence_flag(
  p_n integer,
  p_low_threshold integer,
  p_high_threshold integer
)
returns text
language sql
immutable
as $$
  with normalized as (
    select
      greatest(coalesce(p_n, 0), 0) as n,
      greatest(coalesce(p_low_threshold, 0), 0) as low_threshold,
      greatest(
        greatest(coalesce(p_low_threshold, 0), 0),
        greatest(coalesce(p_high_threshold, 0), 0)
      ) as high_threshold
  )
  select
    case
      when n < low_threshold then 'low'
      when n < high_threshold then 'medium'
      else 'high'
    end
  from normalized;
$$;

grant execute on function app.wilson_interval_low(integer, integer, numeric) to authenticated;
grant execute on function app.wilson_interval_high(integer, integer, numeric) to authenticated;
grant execute on function app.beta_smoothed_rate(numeric, numeric, numeric, numeric) to authenticated;
grant execute on function app.resolve_confidence_flag(integer, integer, integer) to authenticated;

commit;
