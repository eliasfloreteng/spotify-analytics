"use client"

import {
  FetchAllDataResult,
  fetchAllSpotifyData,
  FetchProgress,
} from "@/lib/spotify-data-fetcher"
import { groupSimilarTracks, TrackGroup } from "@/lib/song-deduplication"
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
  loadingProgress?: FetchProgress
  dataResult?: FetchAllDataResult
  trackGroups?: TrackGroup[]
  deduplicatedTracks?: TrackGroup[] // Only groups with unique songs (one representative per group)
  fetchData: () => Promise<void>
  authenticate: () => Promise<void>
  isAuthenticated: boolean
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
  const [loadingProgress, setLoadingProgress] = useState<FetchProgress>()
  const [dataResult, setDataResult] = useState<FetchAllDataResult>()
  const [trackGroups, setTrackGroups] = useState<TrackGroup[]>()
  const [sdk, setSdk] = useState<SpotifyApi | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const sdkRef = useRef<SpotifyApi | null>(null)

  const authenticate = async () => {
    if (!sdkRef.current) {
      console.error("SDK not initialized")
      return
    }

    try {
      const { authenticated } = await sdkRef.current.authenticate()

      if (authenticated) {
        setSdk(sdkRef.current)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Authentication error:", error)
    }
  }

  const fetchData = async () => {
    if (!sdk) {
      console.error("SDK not initialized")
      return
    }

    try {
      const result = await fetchAllSpotifyData(sdk, setLoadingProgress)
      setDataResult(result)

      console.log(
        `Fetched ${result.tracks.length} total tracks, starting deduplication...`,
      )

      // Report deduplication progress
      setLoadingProgress({
        phase: "deduplication",
        current: 0,
        total: 1,
        percentage: 0,
        message: `Analyzing ${result.tracks.length} tracks for duplicates...`,
      })

      // Group similar tracks for deduplication
      try {
        const groups = groupSimilarTracks(result.tracks)
        console.log(
          `Deduplication complete: ${groups.length} unique track groups`,
        )
        setTrackGroups(groups)

        // Report completion
        setLoadingProgress({
          phase: "complete",
          current: 1,
          total: 1,
          percentage: 100,
          message: "All data loaded successfully!",
        })
      } catch (error) {
        console.error("Error during deduplication:", error)
        // Set empty groups on error so the app doesn't hang
        setTrackGroups([])
        setLoadingProgress({
          phase: "complete",
          current: 1,
          total: 1,
          percentage: 100,
          message: "Loaded (deduplication skipped due to error)",
        })
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  useEffect(() => {
    const auth = new AuthorizationCodeWithPKCEStrategy(
      clientId || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
      redirectUrl ||
        process.env.NEXT_PUBLIC_REDIRECT_URI ||
        "http://127.0.0.1:3000/",
      scopes || DEFAULT_SCOPES,
    )
    const internalSdk = new SpotifyApi(auth, config)
    sdkRef.current = internalSdk
    setIsInitialized(true)
  }, [clientId, redirectUrl, config, scopes])

  return (
    <SpotifyContext.Provider
      value={{
        sdk,
        isInitialized,
        dataResult,
        loadingProgress,
        trackGroups,
        deduplicatedTracks: trackGroups,
        fetchData,
        authenticate,
        isAuthenticated,
      }}
    >
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
    ...context,
  }
}
