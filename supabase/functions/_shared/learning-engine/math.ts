export const clamp = (min: number, max: number, value: number) =>
  Math.min(max, Math.max(min, value));

export const daysBetween = (from: Date, to: Date) => {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, (to.getTime() - from.getTime()) / millisecondsPerDay);
};

export const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const toDayKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};
