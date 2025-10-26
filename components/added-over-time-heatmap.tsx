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
} from "recharts"
import type { TrackGroup } from "@/lib/song-deduplication"

interface AddedOverTimeHeatmapProps {
  trackGroups: TrackGroup[]
}

export default function AddedOverTimeHeatmap({
  trackGroups,
}: AddedOverTimeHeatmapProps) {
  const { timelineData, yAxisMax } = useMemo(() => {
    const monthCounts = new Map<string, number>()

    // Use all tracks (not deduplicated) to show when songs were added
    trackGroups.forEach((group) => {
      group.tracks.forEach((track) => {
        const date = new Date(track.added_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1)
      })
    })

    // Convert to array and sort by date
    const data = Array.from(monthCounts.entries())
      .map(([month, count]) => ({
        month,
        count,
        date: new Date(month + "-01"),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    // Calculate median for Y-axis max
    const counts = data.map((d) => d.count).sort((a, b) => a - b)
    const median =
      counts.length === 0
        ? 0
        : counts.length % 2 === 0
          ? (counts[counts.length / 2 - 1] + counts[counts.length / 2]) / 2
          : counts[Math.floor(counts.length / 2)]

    const yAxisMax = median * 3.5

    // Format data
    const formattedData = data.map(({ month, count }) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      }),
      count,
    }))

    return { timelineData: formattedData, yAxisMax }
  }, [trackGroups])

  const stats = useMemo(() => {
    const allDates = trackGroups.flatMap((group) =>
      group.tracks.map((track) => new Date(track.added_at)),
    )

    if (allDates.length === 0) {
      return {
        oldestDate: null,
        newestDate: null,
        totalMonths: 0,
        avgPerMonth: 0,
        peakMonth: null,
        peakCount: 0,
      }
    }

    const oldest = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const newest = new Date(Math.max(...allDates.map((d) => d.getTime())))

    const monthsDiff =
      (newest.getFullYear() - oldest.getFullYear()) * 12 +
      (newest.getMonth() - oldest.getMonth()) +
      1

    const avgPerMonth = Math.round(trackGroups.length / monthsDiff)

    // Find peak month
    const monthCounts = new Map<string, number>()
    trackGroups.forEach((group) => {
      group.tracks.forEach((track) => {
        const date = new Date(track.added_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1)
      })
    })

    let peakMonth = ""
    let peakCount = 0
    monthCounts.forEach((count, month) => {
      if (count > peakCount) {
        peakCount = count
        peakMonth = month
      }
    })

    const peakDate = peakMonth
      ? new Date(peakMonth + "-01").toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      : null

    return {
      oldestDate: oldest.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
      newestDate: newest.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
      totalMonths: monthsDiff,
      avgPerMonth,
      peakMonth: peakDate,
      peakCount,
    }
  }, [trackGroups])

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"First Track"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.oldestDate || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {"Oldest track in library"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Latest Track"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.newestDate || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {"Most recent addition"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Average per Month"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgPerMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {`Over ${stats.totalMonths} months`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Peak Month"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.peakMonth || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {stats.peakCount > 0
                ? `${stats.peakCount} tracks added`
                : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{"Songs Added Over Time"}</CardTitle>
          <CardDescription>{`Track additions to your library by month`}</CardDescription>
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
                  domain={[0, yAxisMax > 0 ? yAxisMax : "auto"]}
                  allowDataOverflow={true}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
