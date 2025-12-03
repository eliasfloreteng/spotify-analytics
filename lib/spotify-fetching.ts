import type {
	Page,
	SavedTrack,
	SimplifiedPlaylist,
	PlaylistedTrack,
	Track,
	SpotifyApi,
	Album,
	SimplifiedTrack,
	Artist,
} from "@spotify/web-api-ts-sdk"
import PQueue from "p-queue"

const MAX_TRACKS_PER_PAGE = 50
const MAX_ALBUMS_PER_REQUEST = 20
const MAX_ARTISTS_PER_REQUEST = 50

export async function fetchSpotifyData(spotify: SpotifyApi) {
	const queue = new PQueue({ concurrency: 3, interval: 1000, intervalCap: 3 })

	const getUser = async () => {
		return await queue.add(() => spotify.currentUser.profile())
	}

	const getSavedTracks = async () => {
		const initialSavedTracks = await queue.add(() =>
			spotify.currentUser.tracks.savedTracks(MAX_TRACKS_PER_PAGE, 0),
		)

		const allSavedTracksPromises: Promise<Page<SavedTrack>>[] = [
			Promise.resolve(initialSavedTracks),
		]

		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset <= initialSavedTracks.total;
			offset += MAX_TRACKS_PER_PAGE
		) {
			allSavedTracksPromises.push(
				queue.add(() =>
					spotify.currentUser.tracks.savedTracks(MAX_TRACKS_PER_PAGE, offset),
				),
			)
		}

		const allSavedTracks = await Promise.all(allSavedTracksPromises)
		return allSavedTracks.flatMap((page) => page.items)
	}

	const getPlaylistTracks = async (playlistId: string) => {
		const initialPlaylistTracks = await queue.add(() =>
			spotify.playlists.getPlaylistItems(
				playlistId,
				undefined,
				undefined,
				MAX_TRACKS_PER_PAGE,
				0,
			),
		)

		const allPlaylistTracksPromises: Promise<Page<PlaylistedTrack<Track>>>[] = [
			Promise.resolve(initialPlaylistTracks),
		]
		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset <= initialPlaylistTracks.total;
			offset += MAX_TRACKS_PER_PAGE
		) {
			allPlaylistTracksPromises.push(
				queue.add(() =>
					spotify.playlists.getPlaylistItems(
						playlistId,
						undefined,
						undefined,
						MAX_TRACKS_PER_PAGE,
						offset,
					),
				),
			)
		}
		const allPlaylistTracks = await Promise.all(allPlaylistTracksPromises)
		return allPlaylistTracks.flatMap((page) => page.items)
	}

	const getUserPlaylistsWithTracks = async () => {
		const initialPlaylistsPage = await queue.add(() =>
			spotify.currentUser.playlists.playlists(MAX_TRACKS_PER_PAGE, 0),
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

		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset <= initialPlaylistsPage.total;
			offset += MAX_TRACKS_PER_PAGE
		) {
			remainingPlaylistPromises.push(
				queue
					.add(() =>
						spotify.currentUser.playlists.playlists(
							MAX_TRACKS_PER_PAGE,
							offset,
						),
					)
					.then((page) => {
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

	const [user, savedTracks, playlistsWithTracks] = await Promise.all([
		getUser(),
		getSavedTracks(),
		getUserPlaylistsWithTracks(),
	])

	const savedTrackAlbumIds = savedTracks.map((track) => track.track.album.id)
	const playlistTrackAlbumIds = playlistsWithTracks.flatMap((playlist) =>
		playlist.tracks.map((track) => track.track.album.id),
	)

	const allAlbumIds = new Set([...savedTrackAlbumIds, ...playlistTrackAlbumIds])

	const getAdditionalAlbumTracks = async (
		albumId: string,
		totalTracks: number,
	) => {
		const allAlbumTracksPromises: Promise<Page<SimplifiedTrack>>[] = []

		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset <= totalTracks;
			offset += MAX_TRACKS_PER_PAGE
		) {
			allAlbumTracksPromises.push(
				queue.add(() =>
					spotify.albums.tracks(
						albumId,
						undefined,
						MAX_TRACKS_PER_PAGE,
						offset,
					),
				),
			)
		}

		const allAlbumTracks = await Promise.all(allAlbumTracksPromises)
		return allAlbumTracks.flatMap((page) => page.items)
	}

	const getAlbumsWithTracks = async (albumIds: string[]) => {
		const albumIdsChunks: string[][] = []
		for (
			let offset = 0;
			offset < albumIds.length;
			offset += MAX_ALBUMS_PER_REQUEST
		) {
			albumIdsChunks.push(
				albumIds.slice(offset, offset + MAX_ALBUMS_PER_REQUEST),
			)
		}

		const allAlbumPromises: Promise<{
			album: Album
			tracks: SimplifiedTrack[]
		}>[] = []

		const albumChunkPromises = albumIdsChunks.map((chunk) =>
			queue
				.add(() => spotify.albums.get(chunk))
				.then((albums) => {
					albums.forEach((album) => {
						if (album.total_tracks <= MAX_TRACKS_PER_PAGE) {
							allAlbumPromises.push(
								Promise.resolve({
									album,
									tracks: album.tracks.items,
								}),
							)
						} else {
							allAlbumPromises.push(
								getAdditionalAlbumTracks(album.id, album.total_tracks).then(
									(additionalTracks) => ({
										album,
										tracks: [...album.tracks.items, ...additionalTracks],
									}),
								),
							)
						}
					})
					return albums
				}),
		)

		await Promise.all(albumChunkPromises)
		const albumsWithTracks = await Promise.all(allAlbumPromises)

		return albumsWithTracks
	}

	const albumsWithTracks = await getAlbumsWithTracks(Array.from(allAlbumIds))

	const savedTracksArtistIds = savedTracks.flatMap((track) =>
		track.track.artists.map((artist) => artist.id),
	)
	const playlistTracksArtistIds = playlistsWithTracks.flatMap((playlist) =>
		playlist.tracks.flatMap((track) =>
			track.track.artists.map((artist) => artist.id),
		),
	)
	const albumTracksArtistIds = albumsWithTracks.flatMap((album) =>
		album.tracks.flatMap((track) => track.artists.map((artist) => artist.id)),
	)
	const allArtistIds = new Set([
		...savedTracksArtistIds,
		...playlistTracksArtistIds,
		...albumTracksArtistIds,
	])

	const getArtists = async (artistIds: string[]) => {
		const artistIdsChunks: string[][] = []
		for (
			let offset = 0;
			offset < artistIds.length;
			offset += MAX_ARTISTS_PER_REQUEST
		) {
			artistIdsChunks.push(
				artistIds.slice(offset, offset + MAX_ARTISTS_PER_REQUEST),
			)
		}

		const allArtistPromises: Promise<{
			artist: Artist
			tracks: SimplifiedTrack[]
		}>[] = []

		const artistChunkPromises = artistIdsChunks.map((chunk) =>
			queue
				.add(() => spotify.artists.get(chunk))
				.then((artists) => {
					return artists
				}),
		)

		await Promise.all(artistChunkPromises)
		const artists = await Promise.all(allArtistPromises)

		return artists
	}

	const artists = await getArtists(Array.from(allArtistIds))

	return {
		user,
		savedTracks,
		playlistsWithTracks,
		albumsWithTracks,
		artists,
	}
}
