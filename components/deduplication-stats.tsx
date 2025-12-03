"use client";

import { Copy, GitMerge, Layers, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupingStats, type TrackGroup } from "@/lib/song-deduplication";

interface DeduplicationStatsProps {
	trackGroups: TrackGroup[];
}

export default function DeduplicationStats({
	trackGroups,
}: DeduplicationStatsProps) {
	const stats = getGroupingStats(trackGroups);

	const duplicateGroups = trackGroups
		.filter((g) => g.tracks.length > 1)
		.sort((a, b) => b.tracks.length - a.tracks.length)
		.slice(0, 10);

	return (
		<div className="space-y-6">
			{/* Overview Stats */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Tracks</CardTitle>
						<Music2 className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats.totalTracks.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats.totalGroups.toLocaleString()} unique songs
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Duplicate Groups
						</CardTitle>
						<Copy className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats.multiTrackGroups.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							{((stats.multiTrackGroups / stats.totalGroups) * 100).toFixed(1)}%
							of all songs
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Largest Group</CardTitle>
						<Layers className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.largestGroup}</div>
						<p className="text-xs text-muted-foreground">
							instances of same song
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Match Types</CardTitle>
						<GitMerge className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="space-y-1">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Strict:</span>
								<span className="font-medium">{stats.strictOnlyGroups}</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Fuzzy:</span>
								<span className="font-medium">{stats.fuzzyOnlyGroups}</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Mixed:</span>
								<span className="font-medium">{stats.mixedGroups}</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Top Duplicates */}
			<Card>
				<CardHeader>
					<CardTitle>Most Duplicated Songs</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{duplicateGroups.map((group, index) => {
							const track = group.representativeTrack;
							const matchType =
								group.matchReasons.hasStrictMatches &&
								group.matchReasons.hasFuzzyMatches
									? "mixed"
									: group.matchReasons.hasStrictMatches
										? "strict"
										: "fuzzy";

							return (
								<div
									key={`${track.id}-${index}`}
									className="flex items-start justify-between gap-4 rounded-lg border p-4"
								>
									<div className="flex-1 space-y-1">
										<div className="flex items-center gap-2">
											<p className="font-medium leading-none">{track.name}</p>
											<Badge
												variant={
													matchType === "strict"
														? "default"
														: matchType === "fuzzy"
															? "secondary"
															: "outline"
												}
												className="text-xs"
											>
												{matchType}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											{track.artists.map((a) => a.name).join(", ")}
										</p>
										<div className="flex flex-wrap gap-2 pt-2">
											{group.tracks.map((t, i) => (
												<Badge key={i} variant="outline" className="text-xs">
													{t.source === "liked"
														? "Liked Songs"
														: t.playlist.name}
												</Badge>
											))}
										</div>
									</div>
									<div className="flex flex-col items-end gap-1">
										<div className="text-2xl font-bold">
											{group.tracks.length}
										</div>
										<p className="text-xs text-muted-foreground">instances</p>
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
