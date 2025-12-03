import { logout, refreshTokensIfNeeded } from "@/lib/spotify-actions"
import { Button } from "@/components/ui/button"
import { getSpotifyClient } from "@/lib/spotify"
import { LogOut } from "lucide-react"
import Login from "@/components/login"
import { fetchSpotifyData } from "@/lib/spotify-fetching"
import {
	type CombinedTrack,
	groupSimilarTracks,
} from "@/lib/song-deduplication"
import SpotifyAnalytics from "@/components/spotify-analytics"
import {
	calculateDashboardStats,
	calculateArtistStats,
	calculateAlbumStats,
	calculatePlaylistStats,
	calculateTimelineStats,
	calculateWeeklyActivityData,
	calculateGenreData,
} from "@/lib/analytics-data"

export default async function HomePage() {
	await refreshTokensIfNeeded()

	const spotify = await getSpotifyClient()
	if (!spotify) {
		return <Login />
	}

	const { user, savedTracks, playlistsWithTracks, albumsWithTracks, artists } =
		await fetchSpotifyData(spotify, (completed, total) => {
			const progress = (completed / total) * 100
			console.log(
				`Progress: ${completed}/${total} requests completed ${progress.toFixed(2)}%`,
			)
		})
	const userPlaylists = playlistsWithTracks.filter(
		(playlist) =>
			playlist.playlist.owner.id === user.id || playlist.playlist.collaborative,
	)

	const playlistSongs = userPlaylists.flatMap((playlist) =>
		playlist.tracks.map((track) => ({
			source: "playlist" as const,
			playlist: playlist.playlist,
			...track,
		})),
	)

	const combinedTracks = [
		...savedTracks.map((track) => ({
			source: "liked" as const,
			...track,
		})),
		...playlistSongs,
	] satisfies CombinedTrack[]

	const groups = groupSimilarTracks(combinedTracks)

	// Create artist map
	const artistMap = new Map(artists.map((artist) => [artist.id, artist]))

	// Pre-compute all data transformations
	const dashboardStats = calculateDashboardStats(groups, artistMap)
	const artistStats = calculateArtistStats(groups, artistMap)
	const albumStats = calculateAlbumStats(groups)
	const playlistStats = calculatePlaylistStats(groups)
	const timelineStats = calculateTimelineStats(groups)
	const weeklyActivityData = calculateWeeklyActivityData(groups)
	const genreData = calculateGenreData(groups, artistMap)

	return (
		<div>
			<h1 className="text-2xl font-bold">Hello {user.display_name}</h1>
			<Button variant="outline" type="button" onClick={logout}>
				<LogOut className="mr-2 h-4 w-4" />
				Logout
			</Button>

			<SpotifyAnalytics
				groups={groups}
				combinedTracks={combinedTracks}
				dashboardStats={dashboardStats}
				artistStats={artistStats}
				albumStats={albumStats}
				playlistStats={playlistStats}
				timelineStats={timelineStats}
				weeklyActivityData={weeklyActivityData}
				genreData={genreData}
			/>
		</div>
	)
}
