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

interface TopArtistsProps {
  songs: ProcessedSong[]
}

export default function TopArtists({ songs }: TopArtistsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null)

  const artistStats = useMemo(() => {
    const stats = new Map<string, { count: number; songs: ProcessedSong[] }>()

    songs.forEach((song) => {
      song.track.artists.forEach((artist) => {
        const existing = stats.get(artist.name) || { count: 0, songs: [] }
        existing.count++
        existing.songs.push(song)
        stats.set(artist.name, existing)
      })
    })

    return Array.from(stats.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [songs])

  const filteredArtists = useMemo(() => {
    if (!searchQuery) return artistStats
    return artistStats.filter((artist) => artist.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [artistStats, searchQuery])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{"Top Artists"}</CardTitle>
          <CardDescription>{`Artists with the most songs in your library`}</CardDescription>
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
                  <span className="text-2xl font-bold text-muted-foreground">{index + 1}</span>
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
                      <DialogDescription>{`${artist.count} songs in your library`}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                      <div className="space-y-2 pr-4">
                        {artist.songs.map((song, idx) => (
                          <div key={`${song.track.id}-${idx}`} className="rounded-lg border bg-card p-3">
                            <p className="font-medium">{song.track.name}</p>
                            <p className="text-sm text-muted-foreground">{song.track.album.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {`${Math.floor(song.track.duration_ms / 60000)}:${String(
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
