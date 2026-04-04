alter table app.practice_sessions
  drop constraint if exists practice_sessions_mode_check;

alter table app.practice_sessions
  add constraint practice_sessions_mode_check
  check (
    mode in (
      'standard',
      'quick_five',
      'weakest',
      'random',
      'review',
      'mixed',
      'simulacro',
      'anti_trap'
    )
  );
