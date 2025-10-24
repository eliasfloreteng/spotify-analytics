"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import type { ProcessedSong } from "@/lib/song-deduplication"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"

interface TopAlbumsProps {
  songs: ProcessedSong[]
}

export default function TopAlbums({ songs }: TopAlbumsProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const albumStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        name: string
        artist: string
        totalTracks: number
        savedTracks: number
        songs: ProcessedSong[]
      }
    >()

    songs.forEach((song) => {
      const key = `${song.track.album.id}-${song.track.album.name}`
      const existing = stats.get(key) || {
        name: song.track.album.name,
        artist: song.track.artists[0]?.name || "Unknown",
        totalTracks: song.track.album.total_tracks,
        savedTracks: 0,
        songs: [],
      }
      existing.savedTracks++
      existing.songs.push(song)
      stats.set(key, existing)
    })

    return Array.from(stats.values())
      .map((album) => ({
        ...album,
        percentage: (album.savedTracks / album.totalTracks) * 100,
      }))
      .sort((a, b) => b.savedTracks - a.savedTracks)
  }, [songs])

  const filteredAlbums = useMemo(() => {
    if (!searchQuery) return albumStats
    return albumStats.filter(
      (album) =>
        album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.artist.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [albumStats, searchQuery])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{"Top Albums"}</CardTitle>
          <CardDescription>{`Albums with the most saved songs and completion percentage`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-3">
            {filteredAlbums.slice(0, 50).map((album, index) => (
              <div
                key={`${album.name}-${album.artist}`}
                className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex gap-4">
                    <span className="text-2xl font-bold text-muted-foreground">{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{album.name}</p>
                      <p className="text-sm text-muted-foreground">{album.artist}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {`${album.savedTracks} of ${album.totalTracks} tracks saved`}
                      </p>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {"View Songs"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{album.name}</DialogTitle>
                        <DialogDescription>
                          {`${album.artist} • ${album.savedTracks} of ${album.totalTracks} tracks`}
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-2 pr-4">
                          {album.songs.map((song, idx) => (
                            <div key={`${song.track.id}-${idx}`} className="rounded-lg border bg-card p-3">
                              <p className="font-medium">{song.track.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {`Track ${song.track.track_number} • ${Math.floor(song.track.duration_ms / 60000)}:${String(
                                  Math.floor((song.track.duration_ms % 60000) / 1000),
                                ).padStart(2, "0")}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{"Completion"}</span>
                    <span className="font-medium">{`${album.percentage.toFixed(1)}%`}</span>
                  </div>
                  <Progress value={album.percentage} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
