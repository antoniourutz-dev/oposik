const KEY = 'oposikapp_text_highlight_v1';

/** Por defecto el marcaje editorial está desactivado. */
export function readTextHighlightPreference(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return false;
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export function writeTextHighlightPreference(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
}
