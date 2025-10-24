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
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import type { ProcessedSong } from "@/lib/song-deduplication"

interface MostPlaylistedSongsProps {
  songs: ProcessedSong[]
}

export default function MostPlaylistedSongs({
  songs,
}: MostPlaylistedSongsProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const songPlaylistCounts = useMemo(() => {
    const counts = new Map<string, { song: ProcessedSong; count: number }>()

    songs.forEach((song) => {
      const key = song.track.id
      const existing = counts.get(key)
      if (existing) {
        existing.count = song.playlistNames.length
      } else {
        counts.set(key, { song, count: song.playlistNames.length })
      }
    })

    return Array.from(counts.values())
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
  }, [songs])

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songPlaylistCounts
    return songPlaylistCounts.filter(
      (item) =>
        item.song.track.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.song.track.artists.some((artist) =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )
  }, [songPlaylistCounts, searchQuery])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{"Most Playlisted Songs"}</CardTitle>
          <CardDescription>{`Songs that appear in multiple playlists`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredSongs.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {"No songs appear in multiple playlists"}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredSongs.slice(0, 100).map((item, index) => (
                <div
                  key={item.song.track.id}
                  className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <span className="text-2xl font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{item.song.track.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.song.track.artists
                            .map((a) => a.name)
                            .join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.song.track.album.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.song.playlistNames.map((playlist, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {playlist}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="shrink-0">
                      {`${item.count} ${item.count === 1 ? "playlist" : "playlists"}`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
