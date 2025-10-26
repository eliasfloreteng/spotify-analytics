"use client"

import { useMemo, useState } from "react"
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
import type { TrackGroup } from "@/lib/song-deduplication"

interface WeeklyActivityGraphProps {
  trackGroups: TrackGroup[]
}

interface DayData {
  date: Date
  count: number
  level: number
}

export default function WeeklyActivityGraph({
  trackGroups,
}: WeeklyActivityGraphProps) {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const { availableYears, dailyDataByYear } = useMemo(() => {
    const dayCounts = new Map<string, number>()

    // Count tracks per day
    trackGroups.forEach((group) => {
      group.tracks.forEach((track) => {
        const date = new Date(track.added_at)
        const dayKey = date.toISOString().split("T")[0]
        dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1)
      })
    })

    // Find date range
    const allDates = trackGroups.flatMap((group) =>
      group.tracks.map((track) => new Date(track.added_at)),
    )

    if (allDates.length === 0) {
      return {
        availableYears: [],
        dailyDataByYear: new Map<number, DayData[]>(),
      }
    }

    const oldestDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const newestDate = new Date(Math.max(...allDates.map((d) => d.getTime())))

    // Get all years in range
    const years: number[] = []
    for (
      let year = oldestDate.getFullYear();
      year <= newestDate.getFullYear();
      year++
    ) {
      years.push(year)
    }

    // Generate daily data for each year with per-year color scaling
    const dataByYear = new Map<number, DayData[]>()

    years.forEach((year) => {
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31)
      const days: DayData[] = []

      const currentDate = new Date(yearStart)
      while (currentDate <= yearEnd) {
        const dayKey = currentDate.toISOString().split("T")[0]
        const count = dayCounts.get(dayKey) || 0

        days.push({
          date: new Date(currentDate),
          count,
          level: 0, // Will be calculated after we have all days for this year
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Calculate levels for this year using 90th percentile to handle outliers
      const yearCounts = days.map((d) => d.count).filter((c) => c > 0)

      if (yearCounts.length > 0) {
        yearCounts.sort((a, b) => a - b)
        const percentile90Index = Math.floor(yearCounts.length * 0.9)
        const max =
          yearCounts[percentile90Index] || yearCounts[yearCounts.length - 1]

        // Assign levels based on this year's 90th percentile
        days.forEach((day: DayData) => {
          if (day.count === 0) {
            day.level = 0
          } else if (day.count <= max * 0.25) {
            day.level = 1
          } else if (day.count <= max * 0.5) {
            day.level = 2
          } else if (day.count <= max * 0.75) {
            day.level = 3
          } else {
            day.level = 4
          }
        })
      }

      dataByYear.set(year, days)
    })

    return {
      availableYears: years.sort((a, b) => b - a),
      dailyDataByYear: dataByYear,
    }
  }, [trackGroups])

  const [selectedYear, setSelectedYear] = useState<string>(() =>
    availableYears.length > 0 ? availableYears[0].toString() : "",
  )

  const currentYearData = useMemo(() => {
    const year = parseInt(selectedYear)
    return dailyDataByYear.get(year) || []
  }, [selectedYear, dailyDataByYear])

  // Group days by week for display
  const weekGroups = useMemo(() => {
    const groups: DayData[][] = []
    let currentWeek: DayData[] = []

    // Find the first day (might not be Monday)
    const firstDay = currentYearData[0]
    if (!firstDay) return []

    // Add empty cells for days before the first day of the year
    const firstDayOfWeek = (firstDay.date.getDay() + 6) % 7 // Convert to Monday = 0
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({
        date: new Date(0),
        count: -1,
        level: -1,
      })
    }

    currentYearData.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        groups.push(currentWeek)
        currentWeek = []
      }
    })

    // Add remaining days to last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: new Date(0),
          count: -1,
          level: -1,
        })
      }
      groups.push(currentWeek)
    }

    return groups
  }, [currentYearData])

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = -1

    weekGroups.forEach((week, weekIndex) => {
      const firstRealDay = week.find((d: DayData) => d.count >= 0)
      if (firstRealDay) {
        const month = firstRealDay.date.getMonth()
        if (month !== lastMonth) {
          labels.push({
            month: firstRealDay.date.toLocaleDateString("en-US", {
              month: "short",
            }),
            weekIndex,
          })
          lastMonth = month
        }
      }
    })

    return labels
  }, [weekGroups])

  const getLevelColor = (level: number): string => {
    const colors = [
      "bg-muted", // 0 - no activity
      "bg-green-200 dark:bg-green-900", // 1 - low
      "bg-green-400 dark:bg-green-700", // 2 - medium
      "bg-green-600 dark:bg-green-500", // 3 - high
      "bg-green-800 dark:bg-green-300", // 4 - very high
    ]
    return colors[level] || colors[0]
  }

  const handleMouseEnter = (day: DayData, event: React.MouseEvent) => {
    setHoveredDay(day)
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  const handleMouseLeave = () => {
    setHoveredDay(null)
  }

  if (availableYears.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{"Daily Activity"}</CardTitle>
            <CardDescription>{"Songs added per day"}</CardDescription>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Month labels */}
          <div className="flex gap-3 pl-[68px]">
            <div className="flex-1 overflow-x-auto">
              <div
                className="inline-flex relative h-6"
                style={{ minWidth: `${weekGroups.length * 18}px` }}
              >
                {monthLabels.map(({ month, weekIndex }) => (
                  <div
                    key={`${month}-${weekIndex}`}
                    className="absolute text-sm text-muted-foreground"
                    style={{ left: `${weekIndex * 18}px` }}
                  >
                    {month}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex gap-3 items-start">
            <div className="flex flex-col gap-1 text-xs text-muted-foreground w-12 items-end pr-2 h-fit">
              <div style={{ height: "14px", lineHeight: "14px" }}>{"Mon"}</div>
              <div style={{ height: "14px" }}></div>
              <div style={{ height: "14px", lineHeight: "14px" }}>{"Wed"}</div>
              <div style={{ height: "14px" }}></div>
              <div style={{ height: "14px", lineHeight: "14px" }}>{"Fri"}</div>
              <div style={{ height: "14px" }}></div>
              <div style={{ height: "14px", lineHeight: "14px" }}>{"Sun"}</div>
            </div>
            <div className="flex-1 overflow-x-auto h-fit">
              <div className="inline-flex gap-1">
                {weekGroups.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      if (day.count === -1) {
                        return (
                          <div
                            key={dayIndex}
                            className="w-[14px] h-[14px] bg-transparent"
                          />
                        )
                      }

                      return (
                        <div
                          key={dayIndex}
                          className={`w-[14px] h-[14px] rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary ${getLevelColor(day.level)}`}
                          onMouseEnter={(e) => handleMouseEnter(day, e)}
                          onMouseLeave={handleMouseLeave}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{"Less"}</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-[14px] h-[14px] rounded-sm ${getLevelColor(level)}`}
              />
            ))}
            <span>{"More"}</span>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 10}px`,
              top: `${tooltipPosition.y + 10}px`,
            }}
          >
            <div className="bg-card border border-border rounded-md shadow-lg p-2 text-sm">
              <div className="font-medium">
                {hoveredDay.count} {hoveredDay.count === 1 ? "song" : "songs"}
              </div>
              <div className="text-xs text-muted-foreground">
                {hoveredDay.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
