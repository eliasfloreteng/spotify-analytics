"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	RefreshCw,
	Music,
	Disc3,
	ListMusic,
	Calendar,
	Radio,
} from "lucide-react"
import Dashboard from "@/components/dashboard"
import TopArtists from "@/components/top-artists"
import TopAlbums from "@/components/top-albums"
import MostPlaylistedSongs from "@/components/most-playlisted-songs"
import AddedOverTimeHeatmap from "@/components/added-over-time-heatmap"
import GenresOverTime from "@/components/genres-over-time"
import type { CombinedTrack, TrackGroup } from "@/lib/song-deduplication"
import type { Artist } from "@spotify/web-api-ts-sdk"

export default function SpotifyAnalytics({
	groups,
	combinedTracks: songs,
	artists,
}: {
	groups: TrackGroup[]
	combinedTracks: CombinedTrack[]
	artists: Artist[]
}) {
	const artistMap = new Map<string, Artist>()
	for (const artist of artists) {
		artistMap.set(artist.id, artist)
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-balance text-4xl font-bold tracking-tight">
							Spotify Listening Insights
						</h1>
						<p className="mt-2 text-muted-foreground">
							{`${groups.length.toLocaleString()} unique songs • ${songs.length.toLocaleString()} total tracks`}
						</p>
					</div>
				</div>

				<Tabs defaultValue="dashboard" className="space-y-6">
					<TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
						<TabsTrigger value="dashboard" className="gap-2">
							<RefreshCw className="h-4 w-4" />
							<span className="hidden sm:inline">Dashboard</span>
						</TabsTrigger>
						<TabsTrigger value="albums" className="gap-2">
							<Disc3 className="h-4 w-4" />
							<span className="hidden sm:inline">Albums</span>
						</TabsTrigger>
						<TabsTrigger value="artists" className="gap-2">
							<Music className="h-4 w-4" />
							<span className="hidden sm:inline">Artists</span>
						</TabsTrigger>
						<TabsTrigger value="playlisted" className="gap-2">
							<ListMusic className="h-4 w-4" />
							<span className="hidden sm:inline">Playlisted</span>
						</TabsTrigger>
						<TabsTrigger value="genres" className="gap-2">
							<Radio className="h-4 w-4" />
							<span className="hidden sm:inline">Genres</span>
						</TabsTrigger>
						<TabsTrigger value="timeline" className="gap-2">
							<Calendar className="h-4 w-4" />
							<span className="hidden sm:inline">Timeline</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="dashboard" className="space-y-4">
						<Dashboard trackGroups={groups} artists={artistMap} />
					</TabsContent>

					<TabsContent value="albums" className="space-y-4">
						<TopAlbums trackGroups={groups} />
					</TabsContent>

					<TabsContent value="artists" className="space-y-4">
						<TopArtists trackGroups={groups} artists={artistMap} />
					</TabsContent>

					<TabsContent value="playlisted" className="space-y-4">
						<MostPlaylistedSongs trackGroups={groups} />
					</TabsContent>

					<TabsContent value="genres" className="space-y-4">
						<GenresOverTime trackGroups={groups} artists={artistMap} />
					</TabsContent>

					<TabsContent value="timeline" className="space-y-4">
						<AddedOverTimeHeatmap trackGroups={groups} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
