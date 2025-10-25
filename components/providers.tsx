"use client"

import { SpotifyProvider } from "@/contexts/spotify-context"
import { localStoragePersister, queryClient } from "@/lib/query-client"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { Analytics } from "@vercel/analytics/next"

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
