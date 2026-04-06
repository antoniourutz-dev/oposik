begin;

-- Estatuto de Autonomía del País Vasco (Ley Orgánica 3/1979) en el workspace «leyes_generales».
insert into app.general_laws (
  law_key,
  curriculum_key,
  title,
  short_title,
  legal_reference_label,
  sort_order,
  status,
  min_questions_to_publish,
  training_intent
)
values (
  'estatuto_autonomia_pais_vasco',
  'leyes_generales',
  'Estatuto de Autonomía del País Vasco',
  'Estatuto País Vasco',
  'Ley Orgánica 3/1979',
  3,
  'published',
  30,
  'Norma basica del ordenamiento autonomico vasco.'
)
on conflict (law_key) do update set
  title = excluded.title,
  short_title = excluded.short_title,
  legal_reference_label = excluded.legal_reference_label,
  sort_order = excluded.sort_order,
  status = excluded.status,
  min_questions_to_publish = excluded.min_questions_to_publish,
  training_intent = excluded.training_intent,
  updated_at = timezone('utc', now());

insert into app.general_law_blocks (
  law_id,
  block_key,
  title,
  sort_order,
  depth,
  status,
  min_questions_for_training,
  training_focus
)
select
  gl.id,
  'eapv_general',
  'Estatuto completo',
  0,
  0,
  'published',
  8,
  'Bloque unico hasta definir titulos o capitulos en datos.'
from app.general_laws gl
where gl.law_key = 'estatuto_autonomia_pais_vasco'
on conflict (law_id, block_key) do update set
  title = excluded.title,
  sort_order = excluded.sort_order,
  status = excluded.status,
  min_questions_for_training = excluded.min_questions_for_training,
  training_focus = excluded.training_focus,
  updated_at = timezone('utc', now());

commit;
