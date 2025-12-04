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
import { SpotifyRepository } from "./db/repository";
import { initializeDatabase } from "./db/schema";

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
): Promise<SpotifyData> {
	// Initialize database on first run
	await initializeDatabase();

	const repository = new SpotifyRepository();

	// Get user ID first
	const userProfile = await spotify.currentUser.profile();
	const userId = userProfile.id;

	// Try to get cached data from database
	const cachedData = await repository.getAllData(userId);
	if (cachedData) {
		console.log("Database cache found, fetching incremental updates...");
		return await fetchIncrementalData(spotify, userId, repository, onProgress);
	}

	console.log("No cached data, performing initial fetch...");

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

	// Fetch all data initially
	const user = await queue
		.add(() => spotify.currentUser.profile())
		.catch((error) => {
			console.error("Error fetching user profile:", error);
			throw error;
		});

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

	const savedTracks = (await Promise.all(allSavedTracksPromises)).flatMap(
		(page) => page.items,
	);

	// Fetch playlists with tracks
	const allTrackPromises: Promise<{
		playlist: SimplifiedPlaylist;
		tracks: PlaylistedTrack<Track>[];
	}>[] = [];

	const initialPlaylistsPage = await queue
		.add(() => spotify.currentUser.playlists.playlists(MAX_TRACKS_PER_PAGE, 0))
		.catch((error) => {
			console.error("Error fetching user playlists:", error);
			return createEmptyPage<SimplifiedPlaylist>();
		});

	for (const playlist of initialPlaylistsPage.items) {
		allTrackPromises.push(
			getPlaylistTracks(playlist.id, spotify, queue).then((tracks) => ({
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
						getPlaylistTracks(playlist.id, spotify, queue).then((tracks) => ({
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

	const albumsWithTracks = await getAlbumsWithTracks(
		Array.from(allAlbumIds),
		spotify,
		queue,
	);

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

	const artists = await getArtists(Array.from(allArtistIds), spotify, queue);

	// Save to database
	await repository.upsertUser(userId, user);
	await repository.insertSavedTracks(userId, savedTracks);

	for (const { playlist, tracks } of playlistsWithTracks) {
		await repository.upsertPlaylist(
			userId,
			playlist.id,
			playlist.snapshot_id,
			playlist,
		);
		await repository.insertPlaylistTracks(userId, playlist.id, tracks);
	}

	await repository.upsertAlbums(
		userId,
		albumsWithTracks.map((a) => a.album),
	);
	for (const { album, tracks } of albumsWithTracks) {
		await repository.insertAlbumTracks(userId, album.id, tracks);
	}

	await repository.upsertArtists(userId, artists);

	// Return data from database to ensure consistency
	const data = await repository.getAllData(userId);
	if (!data) {
		throw new Error("Failed to retrieve data after initial fetch");
	}

	return data;
}

// Incremental fetch logic
async function fetchIncrementalData(
	spotify: SpotifyApi,
	userId: string,
	repository: SpotifyRepository,
	onProgress?: (completed: number, total: number) => void,
): Promise<SpotifyData> {
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

	// 1. Update user profile
	const user = await queue.add(() => spotify.currentUser.profile());
	if (user) {
		await repository.upsertUser(userId, user);
	}

	// 2. Fetch new saved tracks incrementally
	await repository.updateFetchMetadata(userId, "saved_tracks", "in_progress");
	try {
		const lastSavedAt = await repository.getLastSavedTrackTimestamp(userId);
		const newSavedTracks = await fetchNewSavedTracks(
			spotify,
			queue,
			lastSavedAt,
		);

		if (newSavedTracks.length > 0) {
			await repository.insertSavedTracks(userId, newSavedTracks);
			console.log(`Inserted ${newSavedTracks.length} new saved tracks`);
		} else {
			console.log("No new saved tracks");
		}

		await repository.updateFetchMetadata(userId, "saved_tracks", "idle");
	} catch (error) {
		await repository.updateFetchMetadata(
			userId,
			"saved_tracks",
			"error",
			String(error),
		);
		throw error;
	}

	// 3. Fetch playlists incrementally
	await repository.updateFetchMetadata(userId, "playlists", "in_progress");
	try {
		const storedSnapshots = await repository.getPlaylistSnapshots(userId);
		const currentPlaylists = await fetchAllPlaylists(spotify, queue);
		const currentPlaylistIds = new Set(currentPlaylists.map((p) => p.id));

		// Find playlists to update (new or changed snapshot_id)
		const playlistsToUpdate = currentPlaylists.filter(
			(p) =>
				!storedSnapshots.has(p.id) ||
				storedSnapshots.get(p.id) !== p.snapshot_id,
		);

		// Update changed playlists
		for (const playlist of playlistsToUpdate) {
			const tracks = await getPlaylistTracks(playlist.id, spotify, queue);
			await repository.upsertPlaylist(
				userId,
				playlist.id,
				playlist.snapshot_id,
				playlist,
			);
			await repository.insertPlaylistTracks(userId, playlist.id, tracks);
			console.log(
				`Updated playlist: ${playlist.name} (${tracks.length} tracks)`,
			);
		}

		// Delete removed playlists
		const removedPlaylistIds = Array.from(storedSnapshots.keys()).filter(
			(id) => !currentPlaylistIds.has(id),
		);

		for (const playlistId of removedPlaylistIds) {
			await repository.deletePlaylist(userId, playlistId);
			console.log(`Deleted playlist: ${playlistId}`);
		}

		await repository.updateFetchMetadata(userId, "playlists", "idle");
	} catch (error) {
		await repository.updateFetchMetadata(
			userId,
			"playlists",
			"error",
			String(error),
		);
		throw error;
	}

	// 4. Update albums and artists from track data
	const allData = await repository.getAllData(userId);
	if (!allData) throw new Error("Failed to retrieve data after fetch");

	const { savedTracks, playlistsWithTracks } = allData;

	// Extract album IDs
	const savedTrackAlbumIds = savedTracks
		.map((track) => (track.track as Track | null)?.album.id)
		.filter((id) => id !== undefined);
	const playlistTrackAlbumIds = playlistsWithTracks.flatMap((playlist) =>
		playlist.tracks
			.map((track) => (track.track as Track | null)?.album.id)
			.filter((id) => id !== undefined),
	);
	const allAlbumIds = new Set([
		...savedTrackAlbumIds,
		...playlistTrackAlbumIds,
	]);

	const albumsWithTracks = await getAlbumsWithTracks(
		Array.from(allAlbumIds),
		spotify,
		queue,
	);

	// Save albums
	await repository.upsertAlbums(
		userId,
		albumsWithTracks.map((a) => a.album),
	);
	for (const { album, tracks } of albumsWithTracks) {
		await repository.insertAlbumTracks(userId, album.id, tracks);
	}

	// Extract artist IDs
	const savedTracksArtistIds = savedTracks
		.flatMap((track) =>
			(track.track as Track | null)?.artists.map((artist) => artist.id),
		)
		.filter((id) => id !== undefined);
	const playlistTracksArtistIds = playlistsWithTracks.flatMap((playlist) =>
		playlist.tracks
			.flatMap((track) =>
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

	const artists = await getArtists(Array.from(allArtistIds), spotify, queue);

	// Save artists
	await repository.upsertArtists(userId, artists);

	// Return complete data
	const finalData = await repository.getAllData(userId);
	if (!finalData) throw new Error("Failed to retrieve final data");
	return finalData;
}

// Helper function for incremental saved tracks fetch
async function fetchNewSavedTracks(
	spotify: SpotifyApi,
	queue: PQueue,
	lastSavedAt: Date | null,
): Promise<SavedTrack[]> {
	const newTracks: SavedTrack[] = [];
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		const page = await queue
			.add(() =>
				spotify.currentUser.tracks.savedTracks(MAX_TRACKS_PER_PAGE, offset),
			)
			.catch((error) => {
				console.error(
					`Error fetching saved tracks at offset ${offset}:`,
					error,
				);
				return createEmptyPage<SavedTrack>();
			});

		if (!page || page.items.length === 0) {
			hasMore = false;
			break;
		}

		for (const track of page.items) {
			const trackAddedAt = new Date(track.added_at);

			// Stop if we've reached tracks we already have
			if (lastSavedAt && trackAddedAt <= lastSavedAt) {
				hasMore = false;
				break;
			}

			newTracks.push(track);
		}

		offset += MAX_TRACKS_PER_PAGE;

		// Safety check: don't fetch more than 10k tracks in one go
		if (offset >= 10000) {
			console.warn("Reached 10k track limit for incremental fetch");
			hasMore = false;
		}
	}

	return newTracks;
}

// Helper function to fetch all user playlists
async function fetchAllPlaylists(
	spotify: SpotifyApi,
	queue: PQueue,
): Promise<SimplifiedPlaylist[]> {
	const playlists: SimplifiedPlaylist[] = [];
	let offset = 0;
	let total = 0;

	do {
		const page = await queue
			.add(() =>
				spotify.currentUser.playlists.playlists(MAX_TRACKS_PER_PAGE, offset),
			)
			.catch((error) => {
				console.error(`Error fetching playlists at offset ${offset}:`, error);
				return createEmptyPage<SimplifiedPlaylist>();
			});

		playlists.push(...page.items);
		total = page.total;
		offset += MAX_TRACKS_PER_PAGE;
	} while (offset < total);

	return playlists;
}

// Refactored getPlaylistTracks as standalone function
async function getPlaylistTracks(
	playlistId: string,
	spotify: SpotifyApi,
	queue: PQueue,
): Promise<PlaylistedTrack<Track>[]> {
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
}

// Refactored getAlbumsWithTracks as standalone function
async function getAlbumsWithTracks(
	albumIds: string[],
	spotify: SpotifyApi,
	queue: PQueue,
): Promise<{ album: Album; tracks: SimplifiedTrack[] }[]> {
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
							getAdditionalAlbumTracks(
								album.id,
								album.total_tracks,
								spotify,
								queue,
							).then((additionalTracks) => ({
								album,
								tracks: [...album.tracks.items, ...additionalTracks],
							})),
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
}

// Helper function for additional album tracks
async function getAdditionalAlbumTracks(
	albumId: string,
	totalTracks: number,
	spotify: SpotifyApi,
	queue: PQueue,
): Promise<SimplifiedTrack[]> {
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
}

// Refactored getArtists as standalone function
async function getArtists(
	artistIds: string[],
	spotify: SpotifyApi,
	queue: PQueue,
): Promise<Artist[]> {
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
}
