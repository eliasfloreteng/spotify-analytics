"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import type { TrackGroup } from "@/lib/song-deduplication"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Track } from "@spotify/web-api-ts-sdk"

interface TopAlbumsProps {
  trackGroups: TrackGroup[]
}

export default function TopAlbums({ trackGroups }: TopAlbumsProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const albumStats = useMemo(() => {
    const stats = new Map<
      string,
      { album: Track["album"]; count: number; tracks: Track[] }
    >()

    // Use only the representative track from each group (deduplicated)
    trackGroups.forEach((group) => {
      const track = group.representativeTrack
      const key = `${track.album.id}-${track.album.name}`
      const existing = stats.get(key)

      if (existing) {
        existing.count++
        existing.tracks.push(track)
      } else {
        stats.set(key, {
          album: track.album,
          count: 1,
          tracks: [track],
        })
      }
    })

    return Array.from(stats.values()).sort((a, b) => b.count - a.count)
  }, [trackGroups])

  const filteredAlbums = useMemo(() => {
    if (!searchQuery) return albumStats
    return albumStats.filter(
      (item) =>
        item.album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.album.artists.some((artist) =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )
  }, [albumStats, searchQuery])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{"Top Albums"}</CardTitle>
          <CardDescription>{`Albums with the most unique songs in your library`}</CardDescription>
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

          <div className="space-y-2">
            {filteredAlbums.slice(0, 50).map((item, index) => (
              <div
                key={`${item.album.id}-${item.album.name}`}
                className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <a
                  href={`https://open.spotify.com/album/${item.album.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center gap-4 cursor-pointer"
                >
                  <span className="text-2xl font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  {item.album.images?.[0]?.url && (
                    <img
                      src={item.album.images[0].url}
                      alt={item.album.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{item.album.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.album.artists.map((a) => a.name).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {`${item.count} ${item.count === 1 ? "song" : "songs"}`}
                    </p>
                  </div>
                </a>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                    >
                      {"View Songs"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{item.album.name}</DialogTitle>
                      <DialogDescription>
                        {item.album.artists.map((a) => a.name).join(", ")}
                        {` • ${item.count} songs`}
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                      <div className="space-y-2 pr-4">
                        {item.tracks.map((track, idx) => (
                          <a
                            key={`${track.id}-${idx}`}
                            href={`https://open.spotify.com/track/${track.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent cursor-pointer"
                          >
                            <p className="font-medium">{track.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {track.artists.map((a) => a.name).join(", ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {`${Math.floor(track.duration_ms / 60000)}:${String(
                                Math.floor((track.duration_ms % 60000) / 1000),
                              ).padStart(2, "0")}`}
                            </p>
                          </a>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
