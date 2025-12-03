"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	RefreshCw,
	Music,
	Disc3,
	ListMusic,
	Calendar,
	LogIn,
	LogOut,
	Loader2,
	Radio,
} from "lucide-react"
import LoadingIndicator from "@/components/loading-indicator"
import Dashboard from "@/components/dashboard"
import TopArtists from "@/components/top-artists"
import TopAlbums from "@/components/top-albums"
import MostPlaylistedSongs from "@/components/most-playlisted-songs"
import AddedOverTimeHeatmap from "@/components/added-over-time-heatmap"
import GenresOverTime from "@/components/genres-over-time"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function SpotifyAnalytics() {
	const {
		dataResult,
		loadingProgress,
		trackGroups,
		fetchData,
		authenticate,
		logout,
		isAuthenticated,
		isInitialized,
		clearCache,
		lastFetchDate,
		cacheAge,
		isCacheStale,
	} = useSpotify()

	const songs = dataResult?.tracks || []
	const groups = trackGroups || []
	const artists = dataResult?.artists || new Map()

	const handleFetchData = async () => {
		await fetchData()
	}

	const handleClearCache = () => {
		if (
			confirm(
				"Are you sure you want to clear all cached data? You'll need to fetch your data again.",
			)
		) {
			clearCache()
		}
	}

	// Show stale data warning if cache is older than 30 days
	const showStaleWarning = isCacheStale && lastFetchDate

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-balance text-4xl font-bold tracking-tight">
							{"Spotify Analytics"}
						</h1>
						<p className="mt-2 text-muted-foreground">
							{`${groups.length.toLocaleString()} unique songs • ${songs.length.toLocaleString()} total tracks`}
							{cacheAge && (
								<span className="ml-2 text-sm">{`• Last updated ${cacheAge}`}</span>
							)}
						</p>
					</div>
					<div className="flex gap-2">
						<Button onClick={handleFetchData} variant="outline">
							<RefreshCw className="mr-2 h-4 w-4" />
							{"Refresh Data"}
						</Button>
						<Button onClick={handleClearCache} variant="outline">
							<RefreshCw className="mr-2 h-4 w-4" />
							{"Clear Cache"}
						</Button>
						<Button onClick={logout} variant="outline">
							<LogOut className="mr-2 h-4 w-4" />
							{"Log Out"}
						</Button>
					</div>
				</div>

				{showStaleWarning && (
					<Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
						<AlertCircle className="h-4 w-4 text-yellow-500" />
						<AlertDescription className="text-sm">
							{
								"Your data is over 30 days old. Consider refreshing to see your latest music library."
							}
						</AlertDescription>
					</Alert>
				)}

				<Tabs defaultValue="dashboard" className="space-y-6">
					<TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
						<TabsTrigger value="dashboard" className="gap-2">
							<RefreshCw className="h-4 w-4" />
							<span className="hidden sm:inline">{"Dashboard"}</span>
						</TabsTrigger>
						<TabsTrigger value="albums" className="gap-2">
							<Disc3 className="h-4 w-4" />
							<span className="hidden sm:inline">{"Albums"}</span>
						</TabsTrigger>
						<TabsTrigger value="artists" className="gap-2">
							<Music className="h-4 w-4" />
							<span className="hidden sm:inline">{"Artists"}</span>
						</TabsTrigger>
						<TabsTrigger value="playlisted" className="gap-2">
							<ListMusic className="h-4 w-4" />
							<span className="hidden sm:inline">{"Playlisted"}</span>
						</TabsTrigger>
						<TabsTrigger value="genres" className="gap-2">
							<Radio className="h-4 w-4" />
							<span className="hidden sm:inline">{"Genres"}</span>
						</TabsTrigger>
						<TabsTrigger value="timeline" className="gap-2">
							<Calendar className="h-4 w-4" />
							<span className="hidden sm:inline">{"Timeline"}</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="dashboard" className="space-y-4">
						<Dashboard trackGroups={groups} />
					</TabsContent>

					<TabsContent value="albums" className="space-y-4">
						<TopAlbums trackGroups={groups} />
					</TabsContent>

					<TabsContent value="artists" className="space-y-4">
						<TopArtists trackGroups={groups} />
					</TabsContent>

					<TabsContent value="playlisted" className="space-y-4">
						<MostPlaylistedSongs trackGroups={groups} />
					</TabsContent>

					<TabsContent value="genres" className="space-y-4">
						<GenresOverTime trackGroups={groups} artists={artists} />
					</TabsContent>

					<TabsContent value="timeline" className="space-y-4">
						<AddedOverTimeHeatmap trackGroups={groups} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
