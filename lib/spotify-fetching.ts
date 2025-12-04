import type {
	Album,
	Artist,
	Page,
	PlaylistedTrack,
	SavedTrack,
	SimplifiedPlaylist,
	SimplifiedTrack,
	SpotifyApi,
	Track,
	UserProfile,
} from "@spotify/web-api-ts-sdk";
import PQueue from "p-queue";

const MAX_TRACKS_PER_PAGE = 50;
const MAX_ALBUMS_PER_REQUEST = 20;
const MAX_ARTISTS_PER_REQUEST = 50;

function createEmptyPage<T>(): Page<T> {
	return {
		href: "",
		limit: 0,
		next: null,
		offset: 0,
		previous: null,
		total: 0,
		items: [],
	};
}

export interface SpotifyData {
	user: UserProfile;
	savedTracks: SavedTrack[];
	playlistsWithTracks: {
		playlist: SimplifiedPlaylist;
		tracks: PlaylistedTrack<Track>[];
	}[];
	albumsWithTracks: {
		album: Album;
		tracks: SimplifiedTrack[];
	}[];
	artists: Artist[];
}

export async function fetchSpotifyData(
	spotify: SpotifyApi,
	onProgress?: (completed: number, total: number) => void,
) {
	const queue = new PQueue({ concurrency: 4, interval: 1000, intervalCap: 4 });
	let completedRequests = 0;
	let totalRequests = 0;

	queue.on("error", (error) => {
		console.error("Queue error:", error);
	});

	if (onProgress) {
		queue.on("add", () => {
			totalRequests++;
		});

		queue.on("completed", () => {
			completedRequests++;
			onProgress(completedRequests, totalRequests);
		});

		queue.on("error", () => {
			completedRequests++;
			onProgress(completedRequests, totalRequests);
		});
	}

	const getUser = async () => {
		return await queue
			.add(() => spotify.currentUser.profile())
			.catch((error) => {
				console.error("Error fetching user profile:", error);
				throw error;
			});
	};

	const getSavedTracks = async () => {
		const initialSavedTracks = await queue
			.add(() => spotify.currentUser.tracks.savedTracks(MAX_TRACKS_PER_PAGE, 0))
			.catch((error) => {
				console.error("Error fetching saved tracks:", error);
				return createEmptyPage<SavedTrack>();
			});

		const allSavedTracksPromises: Promise<Page<SavedTrack>>[] = [
			Promise.resolve(initialSavedTracks),
		];

		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset < initialSavedTracks.total;
			offset += MAX_TRACKS_PER_PAGE
		) {
			allSavedTracksPromises.push(
				queue
					.add(() =>
						spotify.currentUser.tracks.savedTracks(MAX_TRACKS_PER_PAGE, offset),
					)
					.catch((error) => {
						console.error(
							`Error fetching saved tracks at offset ${offset}:`,
							error,
						);
						return createEmptyPage<SavedTrack>();
					}),
			);
		}

		const allSavedTracks = await Promise.all(allSavedTracksPromises);
		return allSavedTracks.flatMap((page) => page.items);
	};

	const getPlaylistTracks = async (playlistId: string) => {
		const initialPlaylistTracks = await queue
			.add(() =>
				spotify.playlists.getPlaylistItems(
					playlistId,
					undefined,
					undefined,
					MAX_TRACKS_PER_PAGE,
					0,
				),
			)
			.catch((error) => {
				console.error(`Error fetching playlist ${playlistId}:`, error);
				return createEmptyPage<PlaylistedTrack<Track>>();
			});

		const allPlaylistTracksPromises: Promise<Page<PlaylistedTrack<Track>>>[] = [
			Promise.resolve(initialPlaylistTracks),
		];
		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset < initialPlaylistTracks.total;
			offset += MAX_TRACKS_PER_PAGE
		) {
			allPlaylistTracksPromises.push(
				queue
					.add(() =>
						spotify.playlists.getPlaylistItems(
							playlistId,
							undefined,
							undefined,
							MAX_TRACKS_PER_PAGE,
							offset,
						),
					)
					.catch((error) => {
						console.error(
							`Error fetching playlist ${playlistId} at offset ${offset}:`,
							error,
						);
						return createEmptyPage<PlaylistedTrack<Track>>();
					}),
			);
		}
		const allPlaylistTracks = await Promise.all(allPlaylistTracksPromises);
		return allPlaylistTracks.flatMap((page) => page.items);
	};

	const getUserPlaylistsWithTracks = async () => {
		const allTrackPromises: Promise<{
			playlist: SimplifiedPlaylist;
			tracks: PlaylistedTrack<Track>[];
		}>[] = [];

		const initialPlaylistsPage = await queue
			.add(() =>
				spotify.currentUser.playlists.playlists(MAX_TRACKS_PER_PAGE, 0),
			)
			.catch((error) => {
				console.error("Error fetching user playlists:", error);
				return createEmptyPage<SimplifiedPlaylist>();
			});

		for (const playlist of initialPlaylistsPage.items) {
			allTrackPromises.push(
				getPlaylistTracks(playlist.id).then((tracks) => ({
					playlist,
					tracks,
				})),
			);
		}

		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset < initialPlaylistsPage.total;
			offset += MAX_TRACKS_PER_PAGE
		) {
			queue
				.add(() =>
					spotify.currentUser.playlists.playlists(MAX_TRACKS_PER_PAGE, offset),
				)
				.then((page) => {
					for (const playlist of page.items) {
						allTrackPromises.push(
							getPlaylistTracks(playlist.id).then((tracks) => ({
								playlist,
								tracks,
							})),
						);
					}
				})
				.catch((error) => {
					console.error(`Error fetching playlists at offset ${offset}:`, error);
				});
		}

		const playlistsWithTracks = await Promise.all(allTrackPromises);

		return playlistsWithTracks;
	};

	const [user, savedTracks, playlistsWithTracks] = await Promise.all([
		getUser(),
		getSavedTracks(),
		getUserPlaylistsWithTracks(),
	]);

	const savedTrackAlbumIds = savedTracks
		.map((track) => (track.track as Track | null)?.album.id)
		.filter((id) => id !== undefined);
	const playlistTrackAlbumIds = playlistsWithTracks.flatMap((playlist) =>
		playlist.tracks
			// Track can apparently be null
			.map((track) => (track.track as Track | null)?.album.id)
			.filter((id) => id !== undefined),
	);

	const allAlbumIds = new Set([
		...savedTrackAlbumIds,
		...playlistTrackAlbumIds,
	]);

	const getAdditionalAlbumTracks = async (
		albumId: string,
		totalTracks: number,
	) => {
		const allAlbumTracksPromises: Promise<Page<SimplifiedTrack>>[] = [];

		for (
			let offset = MAX_TRACKS_PER_PAGE;
			offset < totalTracks;
			offset += MAX_TRACKS_PER_PAGE
		) {
			allAlbumTracksPromises.push(
				queue
					.add(() =>
						spotify.albums.tracks(
							albumId,
							undefined,
							MAX_TRACKS_PER_PAGE,
							offset,
						),
					)
					.catch((error) => {
						console.error(
							`Error fetching album ${albumId} tracks at offset ${offset}:`,
							error,
						);
						return createEmptyPage<SimplifiedTrack>();
					}),
			);
		}

		const allAlbumTracks = await Promise.all(allAlbumTracksPromises);
		return allAlbumTracks.flatMap((page) => page.items);
	};

	const getAlbumsWithTracks = async (albumIds: string[]) => {
		if (albumIds.length === 0) {
			return [];
		}

		const albumIdsChunks: string[][] = [];
		for (
			let offset = 0;
			offset < albumIds.length;
			offset += MAX_ALBUMS_PER_REQUEST
		) {
			albumIdsChunks.push(
				albumIds.slice(offset, offset + MAX_ALBUMS_PER_REQUEST),
			);
		}

		const allAlbumPromises: Promise<{
			album: Album;
			tracks: SimplifiedTrack[];
		}>[] = [];

		for (const chunk of albumIdsChunks) {
			queue
				.add(() => spotify.albums.get(chunk))
				.then((albums) => {
					for (const album of albums) {
						if (album.total_tracks <= MAX_TRACKS_PER_PAGE) {
							allAlbumPromises.push(
								Promise.resolve({
									album,
									tracks: album.tracks.items,
								}),
							);
						} else {
							allAlbumPromises.push(
								getAdditionalAlbumTracks(album.id, album.total_tracks).then(
									(additionalTracks) => ({
										album,
										tracks: [...album.tracks.items, ...additionalTracks],
									}),
								),
							);
						}
					}
				})
				.catch((error) => {
					console.error(
						`Error fetching albums chunk [${chunk.join(", ")}]:`,
						error,
					);
				});
		}

		const albumsWithTracks = await Promise.all(allAlbumPromises);

		return albumsWithTracks;
	};

	const albumsWithTracks = await getAlbumsWithTracks(Array.from(allAlbumIds));

	const savedTracksArtistIds = savedTracks
		.flatMap((track) =>
			// Track can apparently be null
			(track.track as Track | null)?.artists.map((artist) => artist.id),
		)
		.filter((id) => id !== undefined);

	const playlistTracksArtistIds = playlistsWithTracks.flatMap((playlist) =>
		playlist.tracks
			.flatMap((track) =>
				// Track can apparently be null
				(track.track as Track | null)?.artists.map((artist) => artist.id),
			)
			.filter((id) => id !== undefined),
	);
	const albumTracksArtistIds = albumsWithTracks.flatMap((album) =>
		album.tracks.flatMap((track) => track.artists.map((artist) => artist.id)),
	);
	const allArtistIds = new Set([
		...savedTracksArtistIds,
		...playlistTracksArtistIds,
		...albumTracksArtistIds,
	]);

	const getArtists = async (artistIds: string[]) => {
		if (artistIds.length === 0) {
			return [];
		}

		const artistIdsChunks: string[][] = [];
		for (
			let offset = 0;
			offset < artistIds.length;
			offset += MAX_ARTISTS_PER_REQUEST
		) {
			artistIdsChunks.push(
				artistIds.slice(offset, offset + MAX_ARTISTS_PER_REQUEST),
			);
		}

		const artistChunkPromises = artistIdsChunks.map((chunk) =>
			queue
				.add(() => spotify.artists.get(chunk))
				.catch((error) => {
					console.error(
						`Error fetching artists chunk [${chunk.join(", ")}]:`,
						error,
					);
					return [];
				}),
		);

		const allArtistChunks = await Promise.all(artistChunkPromises);
		return allArtistChunks.flat();
	};

	const artists = await getArtists(Array.from(allArtistIds));

	const data = {
		user,
		savedTracks,
		playlistsWithTracks,
		albumsWithTracks,
		artists,
	};

	return data;
}
