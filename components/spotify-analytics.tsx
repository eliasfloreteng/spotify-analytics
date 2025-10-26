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
import LoadingIndicator from "@/components/loading-indicator"
import Dashboard from "@/components/dashboard"
import TopArtists from "@/components/top-artists"
import TopAlbums from "@/components/top-albums"
import MostPlaylistedSongs from "@/components/most-playlisted-songs"
import AddedOverTimeHeatmap from "@/components/added-over-time-heatmap"
import { useSpotify } from "@/contexts/spotify-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function SpotifyAnalytics() {
  const {
    sdk: spotify,
    dataResult,
    loadingProgress,
    trackGroups,
    fetchData,
    authenticate,
    isAuthenticated,
    isInitialized,
    clearCache,
    lastFetchDate,
    cacheAge,
    isCacheStale,
  } = useSpotify()

  const songs = dataResult?.tracks || []
  const groups = trackGroups || []

  const handleFetchData = async () => {
    await fetchData()
  }

  const handleClearCache = () => {
    if (
      confirm(
        "Are you sure you want to clear all cached data? You'll need to fetch your data again.",
      )
    ) {
      clearCache()
    }
  }

  // const handleFetchSongs = async () => {
  //   setIsLoading(true)
  //   setProgress(0)

  //   const profile = await spotify.currentUser.profile()
  //   console.log("Fetching songs for user:", profile.display_name)

  //   try {
  //     // Generate mock data
  //     const mockData = generateMockData()

  //     // Simulate fetching with progress
  //     const allSongs = await fetchAllSongs(mockData, (current, total) => {
  //       setProgress((current / total) * 100)
  //     })

  //     // Deduplicate songs
  //     const deduplicated = deduplicateSongs(allSongs)

  //     // Save to localStorage
  //     localStorage.setItem("spotify-songs", JSON.stringify(deduplicated))
  //     localStorage.setItem("spotify-fetch-date", new Date().toISOString())

  //     setSongs(deduplicated)
  //     setLastFetched(new Date())
  //   } catch (error) {
  //     console.error("Error fetching songs:", error)
  //   } finally {
  //     setIsLoading(false)
  //     setProgress(0)
  //   }
  // }

  // const handleLogin = async () => {
  //   try {
  //     setIsCheckingAuth(true)
  //     await authenticateSpotify()
  //     setIsAuthenticated(true)
  //   } catch (error) {
  //     console.error("Error during Spotify authentication:", error)
  //   } finally {
  //     setIsCheckingAuth(false)
  //   }
  // }

  // const handleLogout = () => {
  //   logoutSpotify()
  //   setIsAuthenticated(false)
  //   setSongs([])
  //   setLastFetched(null)
  // }

  // if (isCheckingAuth) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center bg-background">
  //       <Card className="w-full max-w-md">
  //         <CardContent className="flex flex-col items-center justify-center py-12">
  //           <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //           <p className="mt-4 text-sm text-muted-foreground">
  //             {"Checking authentication..."}
  //           </p>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   )
  // }

  // Show loading while checking authentication
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              {"Initializing..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 1: Not authenticated - show login button
  if (!isAuthenticated || !spotify) {
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
            <Button onClick={authenticate} className="w-full" size="lg">
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

  // Show loading indicator if data is being fetched
  if (loadingProgress && loadingProgress.phase !== "complete") {
    return (
      <LoadingIndicator
        progress={loadingProgress.percentage}
        loadingProgress={loadingProgress}
      />
    )
  }

  // Step 2: Authenticated but no data - show fetch button
  if (!dataResult || dataResult.tracks.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <Music className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">{"Ready to Analyze"}</CardTitle>
            <CardDescription className="text-base">
              {"Fetch your Spotify data to see your music analytics"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFetchData} className="w-full" size="lg">
              <RefreshCw className="mr-2 h-5 w-5" />
              {"Fetch My Music"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {
                "This will fetch your liked songs, playlists, and analyze for duplicates."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show stale data warning if cache is older than 30 days
  const showStaleWarning = isCacheStale && lastFetchDate

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-balance text-4xl font-bold tracking-tight">
              {"Spotify Analytics"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {`${groups.length.toLocaleString()} unique songs • ${songs.length.toLocaleString()} total tracks`}
              {cacheAge && (
                <span className="ml-2 text-sm">{`• Last updated ${cacheAge}`}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFetchData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {"Refresh Data"}
            </Button>
            <Button onClick={handleClearCache} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              {"Clear Cache"}
            </Button>
          </div>
        </div>

        {showStaleWarning && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm">
              {
                "Your data is over 30 days old. Consider refreshing to see your latest music library."
              }
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{"Dashboard"}</span>
            </TabsTrigger>
            <TabsTrigger value="albums" className="gap-2">
              <Disc3 className="h-4 w-4" />
              <span className="hidden sm:inline">{"Albums"}</span>
            </TabsTrigger>
            <TabsTrigger value="artists" className="gap-2">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">{"Artists"}</span>
            </TabsTrigger>
            <TabsTrigger value="playlisted" className="gap-2">
              <ListMusic className="h-4 w-4" />
              <span className="hidden sm:inline">{"Playlisted"}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{"Timeline"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Dashboard trackGroups={groups} />
          </TabsContent>

          <TabsContent value="albums" className="space-y-4">
            <TopAlbums trackGroups={groups} />
          </TabsContent>

          <TabsContent value="artists" className="space-y-4">
            <TopArtists trackGroups={groups} />
          </TabsContent>

          <TabsContent value="playlisted" className="space-y-4">
            <MostPlaylistedSongs trackGroups={groups} />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <AddedOverTimeHeatmap trackGroups={groups} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
