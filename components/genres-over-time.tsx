"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { GenreData } from "@/lib/analytics-data";

interface GenresOverTimeProps {
	genreData: GenreData;
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
];

// Custom tooltip component that sorts genres by percentage
const CustomTooltip = ({ active, payload, label }: any) => {
	if (!active || !payload || !payload.length) {
		return null;
	}

	// Sort payload by percentage (value) in descending order
	const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

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
				const actualValue = entry.payload[`${entry.name}_actual`];
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
				);
			})}
		</div>
	);
};

export default function GenresOverTime({ genreData }: GenresOverTimeProps) {
	const { genreStats, timelineData, topGenres, overallStats } = genreData;

	return (
		<div className="space-y-4">
			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Total Genres"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{overallStats.totalGenres}</div>
						<p className="text-muted-foreground text-xs">
							{"Unique genres in library"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">{"Top Genre"}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-lg">
							{overallStats.topGenre?.genre || "N/A"}
						</div>
						<p className="text-muted-foreground text-xs">
							{overallStats.topGenre
								? `${overallStats.topGenre.trackCount} tracks (${overallStats.topGenre.percentage.toFixed(1)}%)`
								: "No data"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Avg Genres/Track"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{overallStats.avgGenresPerTrack}
						</div>
						<p className="text-muted-foreground text-xs">
							{"Average genres per track"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Genre Diversity"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{topGenres.length >= 5 ? "High" : "Moderate"}
						</div>
						<p className="text-muted-foreground text-xs">
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
									<span className="font-medium text-muted-foreground text-sm">
										{index + 1}
									</span>
								</div>
								<div className="flex-1">
									<div className="flex items-center justify-between">
										<span className="font-medium">{genre.genre}</span>
										<span className="text-muted-foreground text-sm">
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
									<div className="mt-1 flex justify-between text-muted-foreground text-xs">
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
	);
}
