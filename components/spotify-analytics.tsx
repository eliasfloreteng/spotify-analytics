"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  RefreshCw,
  Music,
  Disc3,
  ListMusic,
  Calendar,
  LogIn,
  LogOut,
  Loader2,
} from "lucide-react"
import { generateMockData, fetchAllSongs } from "@/lib/mock-spotify-data"
import { deduplicateSongs, type ProcessedSong } from "@/lib/song-deduplication"
import LoadingIndicator from "@/components/loading-indicator"
import TopArtists from "@/components/top-artists"
import TopAlbums from "@/components/top-albums"
import MostPlaylistedSongs from "@/components/most-playlisted-songs"
import AddedOverTimeHeatmap from "@/components/added-over-time-heatmap"
import { useSpotify } from "@/hooks/use-spotify"

export default function SpotifyAnalytics() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [progress, setProgress] = useState(0)
  const [songs, setSongs] = useState<ProcessedSong[]>([])
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const spotify = useSpotify()

  const checkAuthentication = async () => {
    const token = await spotify?.getAccessToken()
    return !!token?.access_token
  }

  const authenticateSpotify = async () => {
    await spotify?.authenticate()
  }

  const logoutSpotify = () => {
    spotify?.logOut()
    // Clear any cached data
    if (typeof window !== "undefined") {
      localStorage.removeItem("spotify-songs")
      localStorage.removeItem("spotify-fetch-date")
    }
  }

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      setIsCheckingAuth(true)
      const authenticated = await checkAuthentication()
      setIsAuthenticated(authenticated)
      setIsCheckingAuth(false)

      // Load cached data if available
      const cached = localStorage.getItem("spotify-songs")
      const cachedDate = localStorage.getItem("spotify-fetch-date")

      if (cached && cachedDate) {
        setSongs(JSON.parse(cached))
        setLastFetched(new Date(cachedDate))
      }
    }

    checkAuth()
  }, [])

  if (!spotify) {
    console.log("Spotify SDK not initialized")
    return null
  }

  const handleFetchSongs = async () => {
    setIsLoading(true)
    setProgress(0)

    const profile = await spotify.currentUser.profile()
    console.log("Fetching songs for user:", profile.display_name)

    try {
      // Generate mock data
      const mockData = generateMockData()

      // Simulate fetching with progress
      const allSongs = await fetchAllSongs(mockData, (current, total) => {
        setProgress((current / total) * 100)
      })

      // Deduplicate songs
      const deduplicated = deduplicateSongs(allSongs)

      // Save to localStorage
      localStorage.setItem("spotify-songs", JSON.stringify(deduplicated))
      localStorage.setItem("spotify-fetch-date", new Date().toISOString())

      setSongs(deduplicated)
      setLastFetched(new Date())
    } catch (error) {
      console.error("Error fetching songs:", error)
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  const handleLogin = async () => {
    try {
      setIsCheckingAuth(true)
      await authenticateSpotify()
      setIsAuthenticated(true)
    } catch (error) {
      console.error("Error during Spotify authentication:", error)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleLogout = () => {
    logoutSpotify()
    setIsAuthenticated(false)
    setSongs([])
    setLastFetched(null)
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              {"Checking authentication..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{"Connect to Spotify"}</CardTitle>
            <CardDescription className="text-base">
              {
                "Sign in with your Spotify account to analyze your music library"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleLogin} className="w-full" size="lg">
              <LogIn className="mr-2 h-5 w-5" />
              {"Sign in with Spotify"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {
                "We'll only access your library and playlists. No posting or modifications."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingIndicator progress={progress} />
  }

  if (songs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{"Ready to Analyze"}</CardTitle>
            <CardDescription>
              {"Fetch your Spotify data to see your music analytics"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleFetchSongs} className="w-full" size="lg">
              <Music className="mr-2 h-5 w-5" />
              {"Fetch My Music"}
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full"
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {"Sign Out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-balance text-4xl font-bold tracking-tight">
              {"Spotify Analytics"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {`${songs.length.toLocaleString()} songs analyzed`}
              {lastFetched && (
                <span className="ml-2 text-sm">{`• Last updated ${lastFetched.toLocaleDateString()}`}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFetchSongs} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {"Refresh Data"}
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              {"Sign Out"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="artists" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="artists" className="gap-2">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">{"Top Artists"}</span>
            </TabsTrigger>
            <TabsTrigger value="albums" className="gap-2">
              <Disc3 className="h-4 w-4" />
              <span className="hidden sm:inline">{"Top Albums"}</span>
            </TabsTrigger>
            <TabsTrigger value="playlisted" className="gap-2">
              <ListMusic className="h-4 w-4" />
              <span className="hidden sm:inline">{"Most Playlisted"}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{"Timeline"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artists" className="space-y-4">
            <TopArtists songs={songs} />
          </TabsContent>

          <TabsContent value="albums" className="space-y-4">
            <TopAlbums songs={songs} />
          </TabsContent>

          <TabsContent value="playlisted" className="space-y-4">
            <MostPlaylistedSongs songs={songs} />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <AddedOverTimeHeatmap songs={songs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
