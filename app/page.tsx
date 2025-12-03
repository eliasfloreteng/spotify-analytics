import { logout } from "@/lib/spotify-actions"
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

export default async function HomePage() {
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

	const playlistSongs = playlistsWithTracks.flatMap((playlist) =>
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

	// console.log(combinedTracks.length)

	const groups = groupSimilarTracks(combinedTracks)

	// console.log(groups.length)

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
				artists={artists}
			/>
		</div>
	)
}
