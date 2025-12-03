import { logout } from "@/lib/spotify-actions"
import { Button } from "@/components/ui/button"
import { getSpotifyClient } from "@/lib/spotify"
import { LogOut } from "lucide-react"
import Login from "@/components/login"
import type {
	SavedTrack,
	Page,
	SimplifiedPlaylist,
	PlaylistedTrack,
	Track,
} from "@spotify/web-api-ts-sdk"

export default async function HomePage() {
	const spotify = await getSpotifyClient()
	if (!spotify) {
		return <Login />
	}

	const getUser = async () => {
		return await spotify.currentUser.profile()
	}

	const getSavedTracks = async () => {
		const initialSavedTracks = await spotify.currentUser.tracks.savedTracks(
			50,
			0,
		)

		const allSavedTracksPromises: Promise<Page<SavedTrack>>[] = [
			Promise.resolve(initialSavedTracks),
		]

		for (let i = 50; i <= initialSavedTracks.total; i += 50) {
			allSavedTracksPromises.push(spotify.currentUser.tracks.savedTracks(50, i))
		}

		const allSavedTracks = await Promise.all(allSavedTracksPromises)
		return allSavedTracks.flatMap((page) => page.items)
	}

	const getPlaylistTracks = async (playlistId: string) => {
		const initialPlaylistTracks = await spotify.playlists.getPlaylistItems(
			playlistId,
			undefined,
			undefined,
			50,
			0,
		)

		const allPlaylistTracksPromises: Promise<Page<PlaylistedTrack<Track>>>[] = [
			Promise.resolve(initialPlaylistTracks),
		]
		for (let i = 50; i <= initialPlaylistTracks.total; i += 50) {
			allPlaylistTracksPromises.push(
				spotify.playlists.getPlaylistItems(
					playlistId,
					undefined,
					undefined,
					50,
					i,
				),
			)
		}
		const allPlaylistTracks = await Promise.all(allPlaylistTracksPromises)
		return allPlaylistTracks.flatMap((page) => page.items)
	}

	const getUserPlaylistsWithTracks = async () => {
		const initialPlaylistsPage = await spotify.currentUser.playlists.playlists(
			50,
			0,
		)

		const allTrackPromises: Promise<{
			playlist: SimplifiedPlaylist
			tracks: PlaylistedTrack<Track>[]
		}>[] = initialPlaylistsPage.items.map((playlist) =>
			getPlaylistTracks(playlist.id).then((tracks) => ({
				playlist,
				tracks,
			})),
		)

		const remainingPlaylistPromises: Promise<SimplifiedPlaylist[]>[] = []

		for (let i = 50; i <= initialPlaylistsPage.total; i += 50) {
			remainingPlaylistPromises.push(
				spotify.currentUser.playlists.playlists(50, i).then((page) => {
					// As soon as this page resolves, start fetching its tracks
					page.items.forEach((playlist) => {
						allTrackPromises.push(
							getPlaylistTracks(playlist.id).then((tracks) => ({
								playlist,
								tracks,
							})),
						)
					})
					return page.items
				}),
			)
		}

		await Promise.all(remainingPlaylistPromises)
		const playlistsWithTracks = await Promise.all(allTrackPromises)

		return playlistsWithTracks
	}

	// const [user, savedTracks, playlistsWithTracks] = await Promise.all([
	// 	getUser(),
	// 	getSavedTracks(),
	// 	getUserPlaylistsWithTracks(),
	// ])

	return (
		<div>
			<h1 className="text-2xl font-bold">Hello user</h1>
			<Button variant="outline" type="button" onClick={logout}>
				<LogOut className="mr-2 h-4 w-4" />
				Logout
			</Button>
		</div>
	)
}
