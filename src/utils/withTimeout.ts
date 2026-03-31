/**
 * Corta una promesa si no resuelve en `ms`. Útil porque `fetch`/Supabase no tienen
 * timeout por defecto en el navegador y pueden dejar React Query en `isFetching` eterno.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Tiempo de espera agotado.',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
