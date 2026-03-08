type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

export const readLocalCache = <T>(key: string, maxAgeMs: number): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (typeof parsed?.ts !== 'number') {
      localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - parsed.ts > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

export const writeLocalCache = <T>(key: string, data: T) => {
  try {
    const payload: CacheEnvelope<T> = { ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore cache write errors (quota/private mode)
  }
};

export const removeLocalCache = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};
