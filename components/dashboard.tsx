"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Music, Disc3, ListMusic, TrendingUp } from "lucide-react"
import type { TrackGroup } from "@/lib/song-deduplication"

interface DashboardProps {
  trackGroups: TrackGroup[]
}

export default function Dashboard({ trackGroups }: DashboardProps) {
  const stats = useMemo(() => {
    // Calculate various statistics
    const uniqueSongs = trackGroups.length
    const totalTracks = trackGroups.reduce(
      (sum, group) => sum + group.tracks.length,
      0,
    )
    const duplicates = totalTracks - uniqueSongs

    // Top artists
    const artistCounts = new Map<string, number>()
    trackGroups.forEach((group) => {
      group.representativeTrack.artists.forEach((artist) => {
        artistCounts.set(artist.name, (artistCounts.get(artist.name) || 0) + 1)
      })
    })
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Top albums
    const albumCounts = new Map<string, { name: string; count: number }>()
    trackGroups.forEach((group) => {
      const album = group.representativeTrack.album
      const key = `${album.id}-${album.name}`
      const existing = albumCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        albumCounts.set(key, { name: album.name, count: 1 })
      }
    })
    const topAlbums = Array.from(albumCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Most playlisted songs
    const playlistCounts = trackGroups
      .map((group) => {
        const playlistInstances = group.tracks.filter(
          (t) => t.source === "playlist",
        )
        const uniquePlaylists = new Set(
          playlistInstances.map((t) => t.playlist.id),
        )
        return {
          track: group.representativeTrack,
          count: uniquePlaylists.size,
        }
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate average tracks per playlist
    const playlistTrackCounts = new Map<string, number>()
    trackGroups.forEach((group) => {
      group.tracks.forEach((track) => {
        if (track.source === "playlist") {
          const id = track.playlist.id
          playlistTrackCounts.set(id, (playlistTrackCounts.get(id) || 0) + 1)
        }
      })
    })
    const avgTracksPerPlaylist =
      playlistTrackCounts.size > 0
        ? Math.round(
            Array.from(playlistTrackCounts.values()).reduce(
              (sum, count) => sum + count,
              0,
            ) / playlistTrackCounts.size,
          )
        : 0

    return {
      uniqueSongs,
      totalTracks,
      duplicates,
      topArtists,
      topAlbums,
      playlistCounts: playlistTrackCounts.size,
      avgTracksPerPlaylist,
      mostPlaylisted: playlistCounts,
    }
  }, [trackGroups])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Unique Songs"}
            </CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.uniqueSongs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {`${stats.totalTracks.toLocaleString()} total tracks`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Duplicate Tracks"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.duplicates.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {`${Math.round((stats.duplicates / stats.totalTracks) * 100)}% of library`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Your Playlists"}
            </CardTitle>
            <ListMusic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.playlistCounts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {`~${stats.avgTracksPerPlaylist} tracks per playlist`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Top Artist"}
            </CardTitle>
            <Disc3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.topArtists[0]?.[0] || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.topArtists[0]
                ? `${stats.topArtists[0][1]} songs`
                : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Artists & Albums */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{"Top 5 Artists"}</CardTitle>
            <CardDescription>
              {"Artists with the most songs in your library"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topArtists.map(([name, count], index) => (
                <div key={name} className="flex items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      {`${count} ${count === 1 ? "song" : "songs"}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Top 5 Albums"}</CardTitle>
            <CardDescription>
              {"Albums with the most songs in your library"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topAlbums.map((album, index) => (
                <div key={album.name} className="flex items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {album.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {`${album.count} ${album.count === 1 ? "song" : "songs"}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Playlisted Songs */}
      <Card>
        <CardHeader>
          <CardTitle>{"Most Playlisted Songs"}</CardTitle>
          <CardDescription>
            {"Songs that appear in the most playlists"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.mostPlaylisted.map((item, index) => (
              <div
                key={`${item.track.id}-${index}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {item.track.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {`${item.count} ${item.count === 1 ? "playlist" : "playlists"}`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
