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

interface TopArtistsProps {
  trackGroups: TrackGroup[]
}

export default function TopArtists({ trackGroups }: TopArtistsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null)

  const artistStats = useMemo(() => {
    const stats = new Map<string, { count: number; tracks: Track[] }>()

    // Use only the representative track from each group (deduplicated)
    trackGroups.forEach((group) => {
      const track = group.representativeTrack
      track.artists.forEach((artist) => {
        const existing = stats.get(artist.name) || { count: 0, tracks: [] }
        existing.count++
        existing.tracks.push(track)
        stats.set(artist.name, existing)
      })
    })

    return Array.from(stats.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [trackGroups])

  const filteredArtists = useMemo(() => {
    if (!searchQuery) return artistStats
    return artistStats.filter((artist) =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [artistStats, searchQuery])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{"Top Artists"}</CardTitle>
          <CardDescription>{`Artists with the most unique songs in your library`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            {filteredArtists.slice(0, 50).map((artist, index) => (
              <div
                key={artist.name}
                className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{artist.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {`${artist.count} ${artist.count === 1 ? "song" : "songs"}`}
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
                      <DialogTitle>{artist.name}</DialogTitle>
                      <DialogDescription>{`${artist.count} unique songs in your library`}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                      <div className="space-y-2 pr-4">
                        {artist.tracks.map((track, idx) => (
                          <div
                            key={`${track.id}-${idx}`}
                            className="rounded-lg border bg-card p-3"
                          >
                            <p className="font-medium">{track.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {track.album.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {`${Math.floor(track.duration_ms / 60000)}:${String(
                                Math.floor((track.duration_ms % 60000) / 1000),
                              ).padStart(2, "0")}`}
                            </p>
                          </div>
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
