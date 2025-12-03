"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
} from "recharts";
import type { TimelineStats, WeeklyActivityData } from "@/lib/analytics-data";
import WeeklyActivityGraph from "@/components/weekly-activity-graph";

interface AddedOverTimeHeatmapProps {
	timelineStats: TimelineStats;
	weeklyActivityData: WeeklyActivityData;
}

export default function AddedOverTimeHeatmap({
	timelineStats,
	weeklyActivityData,
}: AddedOverTimeHeatmapProps) {
	const { timelineData, yAxisMax, stats } = timelineStats;

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

			<WeeklyActivityGraph weeklyActivityData={weeklyActivityData} />

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
	);
}
