"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AlbumStats } from "@/lib/analytics-data";

interface TopAlbumsProps {
	albumStats: AlbumStats[];
}

export default function TopAlbums({ albumStats }: TopAlbumsProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredAlbums = useMemo(() => {
		if (!searchQuery) return albumStats;
		return albumStats.filter(
			(item) =>
				item.album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.album.artists.some((artist) =>
					artist.name.toLowerCase().includes(searchQuery.toLowerCase()),
				),
		);
	}, [albumStats, searchQuery]);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>{"Top Albums"}</CardTitle>
					<CardDescription>{`Albums with the most unique songs in your library`}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="relative mb-4">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search albums..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>

					<div className="space-y-2">
						{filteredAlbums.slice(0, 50).map((item, index) => (
							<div
								key={`${item.album.id}-${item.album.name}`}
								className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
							>
								<a
									href={`https://open.spotify.com/album/${item.album.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex flex-1 cursor-pointer items-center gap-4"
								>
									<span className="font-bold text-2xl text-muted-foreground">
										{index + 1}
									</span>
									{item.album.images?.[0]?.url && (
										<img
											src={item.album.images[0].url}
											alt={item.album.name}
											className="h-16 w-16 rounded object-cover"
										/>
									)}
									<div>
										<p className="font-semibold">{item.album.name}</p>
										<p className="text-muted-foreground text-sm">
											{item.album.artists.map((a) => a.name).join(", ")}
										</p>
										<p className="text-muted-foreground text-xs">
											{`${item.count} ${item.count === 1 ? "song" : "songs"}`}
										</p>
									</div>
								</a>

								<Dialog>
									<DialogTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="cursor-pointer"
										>
											{"View Songs"}
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-2xl">
										<DialogHeader>
											<DialogTitle>{item.album.name}</DialogTitle>
											<DialogDescription>
												{item.album.artists.map((a) => a.name).join(", ")}
												{` • ${item.count} songs`}
											</DialogDescription>
										</DialogHeader>
										<ScrollArea className="max-h-[60vh]">
											<div className="space-y-2 pr-4">
												{item.tracks.map((track, idx) => (
													<a
														key={`${track.id}-${idx}`}
														href={`https://open.spotify.com/track/${track.id}`}
														target="_blank"
														rel="noopener noreferrer"
														className="block cursor-pointer rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
													>
														<p className="font-medium">{track.name}</p>
														<p className="text-muted-foreground text-sm">
															{track.artists.map((a) => a.name).join(", ")}
														</p>
														<p className="text-muted-foreground text-xs">
															{`${Math.floor(track.duration_ms / 60000)}:${String(
																Math.floor((track.duration_ms % 60000) / 1000),
															).padStart(2, "0")}`}
														</p>
													</a>
												))}
											</div>
										</ScrollArea>
									</DialogContent>
								</Dialog>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
