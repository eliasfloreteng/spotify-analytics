"use client"

import { SpotifyProvider } from "@/contexts/spotify-context"
import { queryClient } from "@/lib/query-client"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { Analytics } from "@vercel/analytics/next"

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"

export const localStoragePersister = createAsyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
})

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: localStoragePersister,
        }}
      >
        <SpotifyProvider>{children}</SpotifyProvider>
      </PersistQueryClientProvider>
      <Analytics />
    </>
  )
}
