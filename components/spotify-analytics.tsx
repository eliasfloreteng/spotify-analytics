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
import { RefreshCw, Music, Disc3, ListMusic, Calendar } from "lucide-react"
import { generateMockData, fetchAllSongs } from "@/lib/mock-spotify-data"
import { deduplicateSongs, type ProcessedSong } from "@/lib/song-deduplication"
import LoadingIndicator from "@/components/loading-indicator"
import TopArtists from "@/components/top-artists"
import TopAlbums from "@/components/top-albums"
import MostPlaylistedSongs from "@/components/most-playlisted-songs"
import AddedOverTimeHeatmap from "@/components/added-over-time-heatmap"

export default function SpotifyAnalytics() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [songs, setSongs] = useState<ProcessedSong[]>([])
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  useEffect(() => {
    // Load cached data on mount
    const cached = localStorage.getItem("spotify-songs")
    const cachedDate = localStorage.getItem("spotify-fetch-date")

    if (cached && cachedDate) {
      setSongs(JSON.parse(cached))
      setLastFetched(new Date(cachedDate))
    } else {
      // Auto-fetch on first load
      handleFetchSongs()
    }
  }, [])

  const handleFetchSongs = async () => {
    setIsLoading(true)
    setProgress(0)

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

  if (isLoading) {
    return <LoadingIndicator progress={progress} />
  }

  if (songs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{"No Data Available"}</CardTitle>
            <CardDescription>
              {"Fetch your Spotify data to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFetchSongs} className="w-full">
              <Music className="mr-2 h-4 w-4" />
              {"Fetch Songs"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
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
          <Button onClick={handleFetchSongs} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {"Refetch"}
          </Button>
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
