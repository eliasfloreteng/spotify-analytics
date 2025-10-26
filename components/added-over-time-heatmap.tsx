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
  const timelineData = useMemo(() => {
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
      .map(({ month, count }) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        }),
        count,
      }))

    return data
  }, [trackGroups])

  return (
    <div className="space-y-4">
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
                <YAxis className="text-xs" />
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
