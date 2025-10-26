"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import type { TrackGroup } from "@/lib/song-deduplication"
import type { Artist } from "@spotify/web-api-ts-sdk"
import {
  mapTrackGroupsToGenres,
  calculateGenreStats,
  calculateGenreTimeline,
  getTopGenres,
  type GenreStats,
} from "@/lib/genre-analysis"

interface GenresOverTimeProps {
  trackGroups: TrackGroup[]
  artists: Map<string, Artist>
}

// Color palette for top genres
const GENRE_COLORS = [
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
]

// Custom tooltip component that sorts genres by percentage
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  // Sort payload by percentage (value) in descending order
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value)

  return (
    <div
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px",
      }}
    >
      <p
        style={{
          color: "var(--foreground)",
          marginBottom: "8px",
          fontWeight: "500",
        }}
      >
        {label}
      </p>
      {sortedPayload.map((entry: any, index: number) => {
        const actualValue = entry.payload[`${entry.name}_actual`]
        return (
          <div
            key={`item-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: entry.color,
                borderRadius: "2px",
              }}
            />
            <span style={{ color: "var(--foreground)", fontSize: "14px" }}>
              {entry.name}: {actualValue} tracks ({entry.value.toFixed(1)}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function GenresOverTime({
  trackGroups,
  artists,
}: GenresOverTimeProps) {
  const { genreStats, timelineData, topGenres } = useMemo(() => {
    // Map track groups to genres
    const trackGroupsWithGenres = mapTrackGroupsToGenres(trackGroups, artists)

    // Calculate statistics
    const stats = calculateGenreStats(trackGroupsWithGenres)
    const timeline = calculateGenreTimeline(trackGroupsWithGenres)
    const top = getTopGenres(stats, 10)

    // Group timeline data by quarters
    const quarterlyData = new Map<string, Map<string, number>>()

    timeline.forEach((item) => {
      const date = new Date(item.month + "-01")
      const year = date.getFullYear()
      const month = date.getMonth()
      const quarter = Math.floor(month / 3) + 1
      const quarterKey = `Q${quarter} ${year}`

      if (!quarterlyData.has(quarterKey)) {
        quarterlyData.set(quarterKey, new Map())
      }

      const quarterGenres = quarterlyData.get(quarterKey)!

      // Aggregate genre counts for this quarter
      item.genres.forEach((count, genre) => {
        quarterGenres.set(genre, (quarterGenres.get(genre) || 0) + count)
      })
    })

    // Format timeline data for chart with relative percentages
    const formattedTimeline = Array.from(quarterlyData.entries()).map(
      ([quarter, genres]) => {
        const dataPoint: any = {
          month: quarter,
        }

        // Calculate total for this quarter
        let quarterTotal = 0
        top.forEach((genre) => {
          quarterTotal += genres.get(genre.genre) || 0
        })

        // Add top genres as percentages and store actual values
        top.forEach((genre) => {
          const actualValue = genres.get(genre.genre) || 0
          const percentage =
            quarterTotal > 0 ? (actualValue / quarterTotal) * 100 : 0
          dataPoint[genre.genre] = percentage
          dataPoint[`${genre.genre}_actual`] = actualValue
        })

        return dataPoint
      },
    )

    return {
      genreStats: stats,
      timelineData: formattedTimeline,
      topGenres: top,
    }
  }, [trackGroups, artists])

  const overallStats = useMemo(() => {
    const totalGenres = genreStats.length
    const topGenre = genreStats[0]
    const totalTracks = trackGroups.length

    // Calculate average genres per track
    const trackGroupsWithGenres = mapTrackGroupsToGenres(trackGroups, artists)
    const totalGenreAssignments = trackGroupsWithGenres.reduce(
      (sum, group) => sum + group.genres.length,
      0,
    )
    const avgGenresPerTrack = totalGenreAssignments / totalTracks

    return {
      totalGenres,
      topGenre,
      avgGenresPerTrack: avgGenresPerTrack.toFixed(1),
    }
  }, [genreStats, trackGroups, artists])

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Total Genres"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalGenres}</div>
            <p className="text-xs text-muted-foreground">
              {"Unique genres in library"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{"Top Genre"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {overallStats.topGenre?.genre || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {overallStats.topGenre
                ? `${overallStats.topGenre.trackCount} tracks (${overallStats.topGenre.percentage.toFixed(1)}%)`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Avg Genres/Track"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.avgGenresPerTrack}
            </div>
            <p className="text-xs text-muted-foreground">
              {"Average genres per track"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Genre Diversity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topGenres.length >= 5 ? "High" : "Moderate"}
            </div>
            <p className="text-xs text-muted-foreground">
              {`Top 10 genres cover ${topGenres
                .slice(0, 10)
                .reduce((sum, g) => sum + g.percentage, 0)
                .toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Genre Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{"Genre Trends Over Time"}</CardTitle>
          <CardDescription>
            {"Top 10 genres added to your library by quarter"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                {topGenres.slice(0, 10).map((genre, index) => (
                  <Bar
                    key={genre.genre}
                    dataKey={genre.genre}
                    stackId="genres"
                    fill={GENRE_COLORS[index % GENRE_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Genres Table */}
      <Card>
        <CardHeader>
          <CardTitle>{"Top Genres"}</CardTitle>
          <CardDescription>
            {"Most listened genres in your library"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topGenres.slice(0, 15).map((genre, index) => (
              <div key={genre.genre} className="flex items-center gap-4">
                <div className="flex w-8 items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{genre.genre}</span>
                    <span className="text-sm text-muted-foreground">
                      {genre.trackCount} tracks
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${genre.percentage}%`,
                        backgroundColor:
                          GENRE_COLORS[index % GENRE_COLORS.length],
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>{genre.percentage.toFixed(1)}% of library</span>
                    <span>{genre.artistCount} artists</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
