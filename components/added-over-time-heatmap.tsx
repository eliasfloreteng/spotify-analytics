"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProcessedSong } from "@/lib/song-deduplication"

interface AddedOverTimeHeatmapProps {
  songs: ProcessedSong[]
}

export default function AddedOverTimeHeatmap({
  songs,
}: AddedOverTimeHeatmapProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all")

  const { years, heatmapData } = useMemo(() => {
    const yearSet = new Set<number>()
    const dataByYear = new Map<number, Map<number, Map<number, number>>>()

    songs.forEach((song) => {
      if (!song.added_at) return

      const date = new Date(song.added_at)
      const year = date.getFullYear()
      const month = date.getMonth()
      const day = date.getDate()

      yearSet.add(year)

      if (!dataByYear.has(year)) {
        dataByYear.set(year, new Map())
      }
      const yearData = dataByYear.get(year)!

      if (!yearData.has(month)) {
        yearData.set(month, new Map())
      }
      const monthData = yearData.get(month)!

      monthData.set(day, (monthData.get(day) || 0) + 1)
    })

    const sortedYears = Array.from(yearSet).sort((a, b) => b - a)

    return { years: sortedYears, heatmapData: dataByYear }
  }, [songs])

  const displayYear =
    selectedYear === "all" ? years[0] : Number.parseInt(selectedYear)
  const yearData = heatmapData.get(displayYear)

  const maxCount = useMemo(() => {
    if (!yearData) return 0
    let max = 0
    yearData.forEach((monthData) => {
      monthData.forEach((count) => {
        max = Math.max(max, count)
      })
    })
    return max
  }, [yearData])

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted"
    const intensity = Math.min(Math.ceil((count / maxCount) * 4), 4)
    return [
      "bg-chart-1/20",
      "bg-chart-1/40",
      "bg-chart-1/60",
      "bg-chart-1/80",
      "bg-chart-1",
    ][intensity]
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{"Songs Added Over Time"}</CardTitle>
              <CardDescription>{`Heatmap showing when songs were added to your library`}</CardDescription>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{"All Years"}</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!yearData ? (
            <p className="text-center text-muted-foreground">
              {"No data available for selected year"}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2">
                {monthNames.map((month, monthIndex) => (
                  <div key={month} className="space-y-2">
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      {month}
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {Array.from({ length: 31 }, (_, dayIndex) => {
                        const day = dayIndex + 1
                        const daysInMonth = new Date(
                          displayYear,
                          monthIndex + 1,
                          0,
                        ).getDate()

                        if (day > daysInMonth) {
                          return (
                            <div
                              key={day}
                              className="h-3 w-3 rounded-sm bg-transparent"
                            />
                          )
                        }

                        const count = yearData.get(monthIndex)?.get(day) || 0
                        const intensity = getIntensity(count)

                        return (
                          <div
                            key={day}
                            className={`h-3 w-3 rounded-sm ${intensity} transition-colors hover:ring-2 hover:ring-ring`}
                            title={`${month} ${day}, ${displayYear}: ${count} songs`}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>{"Less"}</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-3 w-3 rounded-sm ${
                        level === 0
                          ? "bg-muted"
                          : [
                              "bg-chart-1/20",
                              "bg-chart-1/40",
                              "bg-chart-1/60",
                              "bg-chart-1",
                            ][level - 1]
                      }`}
                    />
                  ))}
                </div>
                <span>{"More"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
