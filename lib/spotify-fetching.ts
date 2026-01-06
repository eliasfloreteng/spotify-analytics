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
import {
	getExistingAlbumIds,
	getExistingArtistIds,
	getExistingTrackIds,
	saveAlbum,
	saveAlbumTracks,
	saveArtist,
	savePlaylist,
	saveSavedTracks,
	saveTrack,
	saveUser,
} from "./spotify-db";

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

	// Step 1: Fetch and save user
	console.log("Fetching user...");
	const user = await getUser();
	await saveUser(user);
	console.log("User saved to database");

	// Step 2: Fetch saved tracks and playlists
	console.log("Fetching saved tracks and playlists...");
	const [savedTracksData, playlistsWithTracksData] = await Promise.all([
		getSavedTracks(),
		getUserPlaylistsWithTracks(),
	]);

	// Step 3: Collect all unique artist IDs from tracks
	console.log("Collecting artist IDs...");
	const savedTracksArtistIds = savedTracksData
		.flatMap((track) =>
			(track.track as Track | null)?.artists.map((artist) => artist.id),
		)
		.filter((id) => id !== undefined) as string[];

	const playlistTracksArtistIds = playlistsWithTracksData.flatMap((playlist) =>
		playlist.tracks
			.flatMap((track) =>
				(track.track as Track | null)?.artists.map((artist) => artist.id),
			)
			.filter((id) => id !== undefined),
	);

	const allArtistIds = Array.from(
		new Set([...savedTracksArtistIds, ...playlistTracksArtistIds]),
	);

	// Step 4: Check which artists already exist in DB and fetch missing ones
	console.log(
		`Checking existing artists (${allArtistIds.length} unique artists)...`,
	);
	const existingArtistIds = await getExistingArtistIds(allArtistIds);
	const missingArtistIds = allArtistIds.filter(
		(id) => !existingArtistIds.has(id),
	);

	console.log(
		`Found ${existingArtistIds.size} existing, fetching ${missingArtistIds.length} missing artists...`,
	);

	// Fetch and save missing artists
	if (missingArtistIds.length > 0) {
		const artistIdsChunks: string[][] = [];
		for (
			let offset = 0;
			offset < missingArtistIds.length;
			offset += MAX_ARTISTS_PER_REQUEST
		) {
			artistIdsChunks.push(
				missingArtistIds.slice(offset, offset + MAX_ARTISTS_PER_REQUEST),
			);
		}

		for (const chunk of artistIdsChunks) {
			const artistsChunk = await queue
				.add(() => spotify.artists.get(chunk))
				.catch((error) => {
					console.error(
						`Error fetching artists chunk [${chunk.join(", ")}]:`,
						error,
					);
					return [];
				});

			for (const artist of artistsChunk) {
				await saveArtist(artist);
			}
		}
		console.log(`Saved ${missingArtistIds.length} new artists to database`);
	}

	// Step 5: Collect album IDs
	console.log("Collecting album IDs...");
	const savedTrackAlbumIds = savedTracksData
		.map((track) => (track.track as Track | null)?.album.id)
		.filter((id) => id !== undefined) as string[];

	const playlistTrackAlbumIds = playlistsWithTracksData.flatMap((playlist) =>
		playlist.tracks
			.map((track) => (track.track as Track | null)?.album.id)
			.filter((id) => id !== undefined),
	) as string[];

	const allAlbumIds = Array.from(
		new Set([...savedTrackAlbumIds, ...playlistTrackAlbumIds]),
	);

	// Step 6: Check which albums already exist and fetch missing ones
	console.log(
		`Checking existing albums (${allAlbumIds.length} unique albums)...`,
	);
	const existingAlbumIds = await getExistingAlbumIds(allAlbumIds);
	const missingAlbumIds = allAlbumIds.filter((id) => !existingAlbumIds.has(id));

	console.log(
		`Found ${existingAlbumIds.size} existing, fetching ${missingAlbumIds.length} missing albums...`,
	);

	// Fetch and save missing albums with their tracks
	if (missingAlbumIds.length > 0) {
		const albumIdsChunks: string[][] = [];
		for (
			let offset = 0;
			offset < missingAlbumIds.length;
			offset += MAX_ALBUMS_PER_REQUEST
		) {
			albumIdsChunks.push(
				missingAlbumIds.slice(offset, offset + MAX_ALBUMS_PER_REQUEST),
			);
		}

		for (const chunk of albumIdsChunks) {
			const albumsChunk = await queue
				.add(() => spotify.albums.get(chunk))
				.catch((error) => {
					console.error(
						`Error fetching albums chunk [${chunk.join(", ")}]:`,
						error,
					);
					return [];
				});

			for (const album of albumsChunk) {
				// Save the album first
				await saveAlbum(album);

				// Fetch additional tracks if album has more than 50 tracks
				let allAlbumTracks = [...album.tracks.items];

				if (album.total_tracks > MAX_TRACKS_PER_PAGE) {
					for (
						let offset = MAX_TRACKS_PER_PAGE;
						offset < album.total_tracks;
						offset += MAX_TRACKS_PER_PAGE
					) {
						const additionalTracks = await queue
							.add(() =>
								spotify.albums.tracks(
									album.id,
									undefined,
									MAX_TRACKS_PER_PAGE,
									offset,
								),
							)
							.catch((error) => {
								console.error(
									`Error fetching album ${album.id} tracks at offset ${offset}:`,
									error,
								);
								return createEmptyPage<SimplifiedTrack>();
							});

						allAlbumTracks = [...allAlbumTracks, ...additionalTracks.items];
					}
				}

				// Save album-track relationships
				await saveAlbumTracks(album.id, allAlbumTracks);
			}
		}
		console.log(`Saved ${missingAlbumIds.length} new albums to database`);
	}

	// Step 7: Collect all track IDs and check which exist
	console.log("Collecting track IDs...");
	const allTrackIds = Array.from(
		new Set([
			...savedTracksData
				.map((st) => (st.track as Track | null)?.id)
				.filter((id) => id !== undefined),
			...playlistsWithTracksData.flatMap((p) =>
				p.tracks
					.map((pt) => (pt.track as Track | null)?.id)
					.filter((id) => id !== undefined),
			),
		]),
	) as string[];

	console.log(
		`Checking existing tracks (${allTrackIds.length} unique tracks)...`,
	);
	const existingTrackIds = await getExistingTrackIds(allTrackIds);
	const missingTrackIds = allTrackIds.filter((id) => !existingTrackIds.has(id));

	console.log(
		`Found ${existingTrackIds.size} existing, saving ${missingTrackIds.length} missing tracks...`,
	);

	// Save missing tracks (we already have them from saved tracks and playlists)
	const allTracksMap = new Map<string, Track>();
	for (const st of savedTracksData) {
		const track = st.track as Track | null;
		if (track && !allTracksMap.has(track.id)) {
			allTracksMap.set(track.id, track);
		}
	}
	for (const playlist of playlistsWithTracksData) {
		for (const pt of playlist.tracks) {
			const track = pt.track as Track | null;
			if (track && !allTracksMap.has(track.id)) {
				allTracksMap.set(track.id, track);
			}
		}
	}

	for (const trackId of missingTrackIds) {
		const track = allTracksMap.get(trackId);
		if (track) {
			await saveTrack(track);
		}
	}
	console.log(`Saved ${missingTrackIds.length} new tracks to database`);

	// Step 8: Save saved tracks relationships
	console.log("Saving saved tracks relationships...");
	await saveSavedTracks(user.id, savedTracksData);

	// Step 9: Save playlists and their tracks
	console.log("Saving playlists...");
	for (const {
		playlist,
		tracks: playlistTracksData,
	} of playlistsWithTracksData) {
		await savePlaylist(playlist, user.id, playlistTracksData);
	}
	console.log(`Saved ${playlistsWithTracksData.length} playlists to database`);

	console.log("All data saved to database successfully!");
}
