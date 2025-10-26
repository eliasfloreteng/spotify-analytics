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
import type { TrackGroup } from "@/lib/song-deduplication"

interface MostPlaylistedSongsProps {
  trackGroups: TrackGroup[]
}

export default function MostPlaylistedSongs({
  trackGroups,
}: MostPlaylistedSongsProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const playlistStats = useMemo(() => {
    // Count how many times each song appears across different sources
    const stats = trackGroups
      .map((group) => {
        // Count instances in playlists (not liked songs)
        const playlistInstances = group.tracks.filter(
          (t) => t.source === "playlist",
        )
        const uniquePlaylists = new Set(
          playlistInstances.map((t) => t.playlist.id),
        )

        return {
          group,
          track: group.representativeTrack,
          totalInstances: group.tracks.length,
          playlistCount: uniquePlaylists.size,
          playlists: Array.from(uniquePlaylists)
            .map((id) => {
              const instance = playlistInstances.find(
                (t) => t.playlist.id === id,
              )
              return instance?.playlist
            })
            .filter(Boolean),
          isInLikedSongs: group.tracks.some((t) => t.source === "liked"),
        }
      })
      .filter((item) => item.playlistCount > 0) // Only show songs that are in at least one playlist
      .sort((a, b) => b.playlistCount - a.playlistCount)

    return stats
  }, [trackGroups])

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return playlistStats
    return playlistStats.filter(
      (item) =>
        item.track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.track.artists.some((artist) =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )
  }, [playlistStats, searchQuery])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{"Most Playlisted Songs"}</CardTitle>
          <CardDescription>{`Songs that appear in the most playlists`}</CardDescription>
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

          <div className="space-y-3">
            {filteredSongs.slice(0, 50).map((item, index) => (
              <div
                key={`${item.track.id}-${index}`}
                className="rounded-lg border bg-card p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold leading-none">
                          {item.track.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.track.artists.map((a) => a.name).join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{item.playlistCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.playlistCount === 1 ? "playlist" : "playlists"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.isInLikedSongs && (
                    <Badge variant="default" className="text-xs">
                      Liked Songs
                    </Badge>
                  )}
                  {item.playlists.map((playlist, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {playlist?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
