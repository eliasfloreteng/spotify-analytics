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
import type { ArtistStats } from "@/lib/analytics-data";

interface TopArtistsProps {
	artistStats: ArtistStats[];
}

export default function TopArtists({ artistStats }: TopArtistsProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredArtists = useMemo(() => {
		if (!searchQuery) return artistStats;
		return artistStats.filter((artist) =>
			artist.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [artistStats, searchQuery]);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>{"Top Artists"}</CardTitle>
					<CardDescription>{`Artists with the most unique songs in your library`}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="relative mb-4">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search artists..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>

					<div className="space-y-2">
						{filteredArtists.slice(0, 50).map((artist, index) => (
							<div
								key={artist.name}
								className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
							>
								<a
									href={`https://open.spotify.com/artist/${artist.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex flex-1 cursor-pointer items-center gap-4"
								>
									<span className="font-bold text-2xl text-muted-foreground">
										{index + 1}
									</span>
									{artist.imageUrl && (
										<img
											src={artist.imageUrl}
											alt={artist.name}
											className="h-16 w-16 rounded-full object-cover"
										/>
									)}
									<div>
										<p className="font-semibold">{artist.name}</p>
										<p className="text-muted-foreground text-xs">
											{`${artist.count} ${artist.count === 1 ? "song" : "songs"}`}
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
											<DialogTitle>{artist.name}</DialogTitle>
											<DialogDescription>{`${artist.count} unique songs in your library`}</DialogDescription>
										</DialogHeader>
										<ScrollArea className="max-h-[60vh]">
											<div className="space-y-2 pr-4">
												{artist.tracks.map((track, idx) => (
													<a
														key={`${track.id}-${idx}`}
														href={`https://open.spotify.com/track/${track.id}`}
														target="_blank"
														rel="noopener noreferrer"
														className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
													>
														{track.album.images?.[0]?.url && (
															<img
																src={track.album.images[0].url}
																alt={track.album.name}
																className="h-12 w-12 flex-shrink-0 rounded object-cover"
															/>
														)}
														<div className="min-w-0 flex-1">
															<p className="truncate font-medium">
																{track.name}
															</p>
															<p className="truncate text-muted-foreground text-sm">
																{track.album.name}
															</p>
															<p className="text-muted-foreground text-xs">
																{`${Math.floor(track.duration_ms / 60000)}:${String(
																	Math.floor(
																		(track.duration_ms % 60000) / 1000,
																	),
																).padStart(2, "0")}`}
															</p>
														</div>
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
