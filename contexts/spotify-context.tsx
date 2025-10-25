"use client"

import {
  AuthorizationCodeWithPKCEStrategy,
  SdkOptions,
  SpotifyApi,
} from "@spotify/web-api-ts-sdk"
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
  throw new Error("Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable")
}

const DEFAULT_SCOPES = [
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-private",
  "user-read-email",
]

interface SpotifyContextValue {
  sdk: SpotifyApi | null
  isInitialized: boolean
}

const SpotifyContext = createContext<SpotifyContextValue | undefined>(undefined)

interface SpotifyProviderProps {
  children: ReactNode
  clientId?: string
  redirectUrl?: string
  scopes?: string[]
  config?: SdkOptions
}

export function SpotifyProvider({
  children,
  clientId,
  redirectUrl,
  scopes,
  config,
}: SpotifyProviderProps) {
  const [sdk, setSdk] = useState<SpotifyApi | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { current: activeScopes } = useRef(scopes || DEFAULT_SCOPES)

  useEffect(() => {
    ;(async () => {
      const auth = new AuthorizationCodeWithPKCEStrategy(
        clientId || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
        redirectUrl ||
          process.env.NEXT_PUBLIC_REDIRECT_URI ||
          "http://127.0.0.1:3000/",
        activeScopes,
      )
      const internalSdk = new SpotifyApi(auth, config)

      try {
        const { authenticated } = await internalSdk.authenticate()

        if (authenticated) {
          setSdk(() => internalSdk)
        }
      } catch (e: Error | unknown) {
        const error = e as Error
        if (
          error &&
          error.message &&
          error.message.includes("No verifier found in cache")
        ) {
          console.error(
            "If you are seeing this error in a React Development Environment it's because React calls useEffect twice. Using the Spotify SDK performs a token exchange that is only valid once, so React re-rendering this component will result in a second, failed authentication. This will not impact your production applications (or anything running outside of Strict Mode - which is designed for debugging components).",
            error,
          )
        } else {
          console.error(e)
        }
      } finally {
        setIsInitialized(true)
      }
    })()
  }, [clientId, redirectUrl, config, activeScopes])

  return (
    <SpotifyContext.Provider value={{ sdk, isInitialized }}>
      {children}
    </SpotifyContext.Provider>
  )
}

export function useSpotify() {
  const context = useContext(SpotifyContext)
  if (context === undefined) {
    throw new Error("useSpotify must be used within a SpotifyProvider")
  }
  return {
    sdk: context.sdk,
  }
}
