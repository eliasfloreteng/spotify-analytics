"use client";

import { Disc3, ListMusic, Music, TrendingUp } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { DashboardStats } from "@/lib/analytics-data";

interface DashboardProps {
	stats: DashboardStats;
}

export default function Dashboard({ stats }: DashboardProps) {
	return (
		<div className="space-y-6">
			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Unique Songs"}
						</CardTitle>
						<Music className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{stats.uniqueSongs.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							{`${stats.totalTracks.toLocaleString()} total tracks`}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Duplicate Tracks"}
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{stats.duplicates.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							{`${Math.round((stats.duplicates / stats.totalTracks) * 100)}% of library`}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Your Playlists"}
						</CardTitle>
						<ListMusic className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{stats.playlistCounts.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							{`~${stats.avgTracksPerPlaylist} tracks per playlist`}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Top Artist"}
						</CardTitle>
						<Disc3 className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{stats.topArtists[0]?.name || "N/A"}
						</div>
						<p className="text-muted-foreground text-xs">
							{stats.topArtists[0]
								? `${stats.topArtists[0].count} songs`
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
							{stats.topArtists.map((artist, index) => (
								<a
									key={artist.id}
									href={`https://open.spotify.com/artist/${artist.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
								>
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
										{index + 1}
									</div>
									<div className="space-y-1">
										<p className="font-medium text-sm leading-none">
											{artist.name}
										</p>
										<p className="text-muted-foreground text-sm">
											{`${artist.count} ${artist.count === 1 ? "song" : "songs"}`}
										</p>
									</div>
								</a>
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
								<a
									key={album.id}
									href={`https://open.spotify.com/album/${album.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
								>
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
										{index + 1}
									</div>
									{album.imageUrl && (
										<img
											src={album.imageUrl}
											alt={album.name}
											className="h-10 w-10 rounded object-cover"
										/>
									)}
									<div className="space-y-1">
										<p className="font-medium text-sm leading-none">
											{album.name}
										</p>
										<p className="text-muted-foreground text-sm">
											{`${album.count} ${album.count === 1 ? "song" : "songs"}`}
										</p>
									</div>
								</a>
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
							<a
								key={`${item.track.id}-${index}`}
								href={`https://open.spotify.com/track/${item.track.id}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent"
							>
								<div className="flex items-center space-x-4">
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
										{index + 1}
									</div>
									{item.track.album.images?.[0]?.url && (
										<img
											src={item.track.album.images[0].url}
											alt={item.track.album.name}
											className="h-10 w-10 rounded object-cover"
										/>
									)}
									<div>
										<p className="font-medium text-sm leading-none">
											{item.track.name}
										</p>
										<p className="text-muted-foreground text-sm">
											{item.track.artists.map((a) => a.name).join(", ")}
										</p>
									</div>
								</div>
								<div className="font-medium text-sm">
									{`${item.count} ${item.count === 1 ? "playlist" : "playlists"}`}
								</div>
							</a>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
