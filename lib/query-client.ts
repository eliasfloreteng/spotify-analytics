import { QueryClient } from "@tanstack/react-query"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"

export const localStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
})
