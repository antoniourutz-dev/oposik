import {
  MutationCache,
  QueryCache,
  QueryClient
} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      void import('./telemetry/telemetryClient')
        .then(({ recordQueryError }) => {
          recordQueryError('react_query.query_error', {
            queryKey: JSON.stringify(query.queryKey),
            error: error instanceof Error ? error.message : 'unknown error'
          });
        })
        .catch(() => undefined);
    }
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      void import('./telemetry/telemetryClient')
        .then(({ recordQueryError }) => {
          recordQueryError('react_query.mutation_error', {
            mutationKey: JSON.stringify(mutation.options.mutationKey ?? []),
            error: error instanceof Error ? error.message : 'unknown error'
          });
        })
        .catch(() => undefined);
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});
