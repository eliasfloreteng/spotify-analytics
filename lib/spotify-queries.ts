import type {
	Album,
	Artist,
	PlaylistedTrack,
	SavedTrack,
	SimplifiedPlaylist,
	SimplifiedTrack,
	Track,
	UserProfile,
} from "@spotify/web-api-ts-sdk";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
	albumArtists,
	albumImages,
	albums,
	albumTracks,
	artistImages,
	artists,
	playlistImages,
	playlists,
	playlistTracks,
	savedTracks,
	trackArtists,
	tracks,
	userImages,
	users,
} from "./db/schema";

// Helper function to reconstruct Image[] from database
function reconstructImages(
	imageRows: Array<{
		url: string;
		height: number | null;
		width: number | null;
		position: number;
	}>,
) {
	return imageRows
		.sort((a, b) => a.position - b.position)
		.map((img) => ({
			url: img.url,
			height: img.height ?? 0,
			width: img.width ?? 0,
		}));
}

// Get current user from database
export async function getCurrentUser(): Promise<UserProfile | null> {
	const userRows = await db
		.select()
		.from(users)
		.limit(1); // Assuming single user for now

	if (userRows.length === 0) return null;

	const user = userRows[0];

	// Get user images
	const imageRows = await db
		.select()
		.from(userImages)
		.where(eq(userImages.userId, user.spotifyId));

	return {
		id: user.spotifyId,
		display_name: user.displayName ?? "",
		email: user.email ?? "",
		country: user.country ?? "",
		product: user.product ?? "",
		uri: user.uri,
		href: user.href ?? "",
		type: "user",
		followers: (user.followers as { href: string | null; total: number }) ?? {
			href: null,
			total: 0,
		},
		external_urls: (user.externalUrls as { spotify: string }) ?? {
			spotify: "",
		},
		explicit_content: (user.explicitContent as {
			filter_enabled: boolean;
			filter_locked: boolean;
		}) ?? { filter_enabled: false, filter_locked: false },
		images: reconstructImages(imageRows),
	};
}

// Get all artists from database
export async function getAllArtists(): Promise<Artist[]> {
	const artistRows = await db.select().from(artists);

	// Get all artist images in one query
	const allArtistIds = artistRows.map((a) => a.spotifyId);
	const imageRows = await db
		.select()
		.from(artistImages)
		.where(
			eq(
				artistImages.artistId,
				db
					.select({ id: artists.spotifyId })
					.from(artists)
					.where(eq(artists.spotifyId, artistImages.artistId)) as any,
			),
		);

	// Group images by artist ID
	const imagesByArtist = new Map<
		string,
		Array<{
			url: string;
			height: number | null;
			width: number | null;
			position: number;
		}>
	>();
	for (const img of imageRows) {
		if (!imagesByArtist.has(img.artistId)) {
			imagesByArtist.set(img.artistId, []);
		}
		imagesByArtist.get(img.artistId)!.push(img);
	}

	return artistRows.map((artist) => ({
		id: artist.spotifyId,
		name: artist.name,
		uri: artist.uri,
		popularity: artist.popularity ?? 0,
		href: artist.href ?? "",
		type: artist.type,
		followers: (artist.followers as { href: string | null; total: number }) ?? {
			href: null,
			total: 0,
		},
		external_urls: (artist.externalUrls as { spotify: string }) ?? {
			spotify: "",
		},
		genres: (artist.genres as string[]) ?? [],
		images: reconstructImages(imagesByArtist.get(artist.spotifyId) ?? []),
	}));
}

// Get saved tracks with full Track details
export async function getSavedTracks(userId: string): Promise<SavedTrack[]> {
	const savedTrackRows = await db
		.select({
			addedAt: savedTracks.addedAt,
			track: tracks,
			album: albums,
		})
		.from(savedTracks)
		.innerJoin(tracks, eq(savedTracks.trackId, tracks.spotifyId))
		.innerJoin(albums, eq(tracks.albumId, albums.spotifyId))
		.where(eq(savedTracks.userId, userId))
		.orderBy(desc(savedTracks.addedAt));

	// Get all track IDs and album IDs
	const trackIds = savedTrackRows.map((row) => row.track.spotifyId);
	const albumIds = savedTrackRows.map((row) => row.album.spotifyId);

	// Get track artists
	const trackArtistRows = await db
		.select({
			trackId: trackArtists.trackId,
			artistId: trackArtists.artistId,
			artistName: artists.name,
			artistUri: artists.uri,
			artistType: artists.type,
			artistHref: artists.href,
			artistExternalUrls: artists.externalUrls,
			position: trackArtists.position,
		})
		.from(trackArtists)
		.innerJoin(artists, eq(trackArtists.artistId, artists.spotifyId))
		.where(eq(trackArtists.trackId, trackArtists.trackId));

	// Get album artists and images
	const albumArtistRows = await db
		.select({
			albumId: albumArtists.albumId,
			artistId: albumArtists.artistId,
			artistName: artists.name,
			artistUri: artists.uri,
			artistType: artists.type,
			artistHref: artists.href,
			artistExternalUrls: artists.externalUrls,
			position: albumArtists.position,
		})
		.from(albumArtists)
		.innerJoin(artists, eq(albumArtists.artistId, artists.spotifyId))
		.where(eq(albumArtists.albumId, albumArtists.albumId));

	const albumImageRows = await db.select().from(albumImages);

	// Group data by IDs
	const trackArtistsByTrack = new Map<string, any[]>();
	for (const row of trackArtistRows) {
		if (!trackArtistsByTrack.has(row.trackId)) {
			trackArtistsByTrack.set(row.trackId, []);
		}
		trackArtistsByTrack.get(row.trackId)!.push(row);
	}

	const albumArtistsByAlbum = new Map<string, any[]>();
	for (const row of albumArtistRows) {
		if (!albumArtistsByAlbum.has(row.albumId)) {
			albumArtistsByAlbum.set(row.albumId, []);
		}
		albumArtistsByAlbum.get(row.albumId)!.push(row);
	}

	const albumImagesByAlbum = new Map<string, any[]>();
	for (const img of albumImageRows) {
		if (!albumImagesByAlbum.has(img.albumId)) {
			albumImagesByAlbum.set(img.albumId, []);
		}
		albumImagesByAlbum.get(img.albumId)!.push(img);
	}

	return savedTrackRows.map((row) => {
		const trackArtistList = (trackArtistsByTrack.get(row.track.spotifyId) ?? [])
			.sort((a, b) => a.position - b.position)
			.map((ta) => ({
				id: ta.artistId,
				name: ta.artistName,
				uri: ta.artistUri,
				type: ta.artistType,
				href: ta.artistHref ?? "",
				external_urls: (ta.artistExternalUrls as { spotify: string }) ?? {
					spotify: "",
				},
			}));

		const albumArtistList = (
			albumArtistsByAlbum.get(row.album.spotifyId) ?? []
		)
			.sort((a, b) => a.position - b.position)
			.map((aa) => ({
				id: aa.artistId,
				name: aa.artistName,
				uri: aa.artistUri,
				type: aa.artistType,
				href: aa.artistHref ?? "",
				external_urls: (aa.artistExternalUrls as { spotify: string }) ?? {
					spotify: "",
				},
			}));

		const albumImgs = reconstructImages(
			albumImagesByAlbum.get(row.album.spotifyId) ?? [],
		);

		const track: Track = {
			id: row.track.spotifyId,
			name: row.track.name,
			uri: row.track.uri,
			duration_ms: row.track.durationMs,
			popularity: row.track.popularity ?? 0,
			explicit: row.track.explicit,
			preview_url: row.track.previewUrl,
			disc_number: row.track.discNumber,
			track_number: row.track.trackNumber,
			is_local: row.track.isLocal,
			href: row.track.href ?? "",
			type: row.track.type,
			external_ids: (row.track.externalIds as {
				isrc?: string;
				ean?: string;
				upc?: string;
			}) ?? {},
			external_urls: (row.track.externalUrls as { spotify: string }) ?? {
				spotify: "",
			},
			available_markets: (row.track.availableMarkets as string[]) ?? [],
			artists: trackArtistList,
			album: {
				id: row.album.spotifyId,
				name: row.album.name,
				uri: row.album.uri,
				album_type: row.album.albumType,
				total_tracks: row.album.totalTracks,
				release_date: row.album.releaseDate,
				release_date_precision: row.album.releaseDatePrecision,
				href: row.album.href ?? "",
				type: row.album.type,
				external_urls: (row.album.externalUrls as { spotify: string }) ?? {
					spotify: "",
				},
				images: albumImgs,
				artists: albumArtistList,
				album_group: "album",
				available_markets: (row.album.availableMarkets as string[]) ?? [],
			},
			episode: false,
			track: true,
		};

		return {
			added_at: row.addedAt.toISOString(),
			track,
		};
	});
}

// Get playlists with tracks
export async function getPlaylistsWithTracks(
	userId: string,
): Promise<
	Array<{ playlist: SimplifiedPlaylist; tracks: PlaylistedTrack<Track>[] }>
> {
	// Get all playlists for the user
	const playlistRows = await db
		.select()
		.from(playlists)
		.where(eq(playlists.ownerId, userId));

	const result: Array<{
		playlist: SimplifiedPlaylist;
		tracks: PlaylistedTrack<Track>[];
	}> = [];

	for (const playlist of playlistRows) {
		// Get playlist images
		const playlistImgs = await db
			.select()
			.from(playlistImages)
			.where(eq(playlistImages.playlistId, playlist.spotifyId));

		// Get playlist tracks with full track details
		const playlistTrackRows = await db
			.select({
				playlistTrack: playlistTracks,
				track: tracks,
				album: albums,
			})
			.from(playlistTracks)
			.innerJoin(tracks, eq(playlistTracks.trackId, tracks.spotifyId))
			.innerJoin(albums, eq(tracks.albumId, albums.spotifyId))
			.where(eq(playlistTracks.playlistId, playlist.spotifyId))
			.orderBy(playlistTracks.position);

		// Get track artists for all tracks in this playlist
		const trackIds = playlistTrackRows.map((row) => row.track.spotifyId);
		const albumIds = playlistTrackRows.map((row) => row.album.spotifyId);

		const trackArtistRows = await db
			.select({
				trackId: trackArtists.trackId,
				artistId: trackArtists.artistId,
				artistName: artists.name,
				artistUri: artists.uri,
				artistType: artists.type,
				artistHref: artists.href,
				artistExternalUrls: artists.externalUrls,
				position: trackArtists.position,
			})
			.from(trackArtists)
			.innerJoin(artists, eq(trackArtists.artistId, artists.spotifyId));

		const albumArtistRows = await db
			.select({
				albumId: albumArtists.albumId,
				artistId: albumArtists.artistId,
				artistName: artists.name,
				artistUri: artists.uri,
				artistType: artists.type,
				artistHref: artists.href,
				artistExternalUrls: artists.externalUrls,
				position: albumArtists.position,
			})
			.from(albumArtists)
			.innerJoin(artists, eq(albumArtists.artistId, artists.spotifyId));

		const albumImageRows = await db.select().from(albumImages);

		// Group by IDs
		const trackArtistsByTrack = new Map<string, any[]>();
		for (const row of trackArtistRows) {
			if (!trackArtistsByTrack.has(row.trackId)) {
				trackArtistsByTrack.set(row.trackId, []);
			}
			trackArtistsByTrack.get(row.trackId)!.push(row);
		}

		const albumArtistsByAlbum = new Map<string, any[]>();
		for (const row of albumArtistRows) {
			if (!albumArtistsByAlbum.has(row.albumId)) {
				albumArtistsByAlbum.set(row.albumId, []);
			}
			albumArtistsByAlbum.get(row.albumId)!.push(row);
		}

		const albumImagesByAlbum = new Map<string, any[]>();
		for (const img of albumImageRows) {
			if (!albumImagesByAlbum.has(img.albumId)) {
				albumImagesByAlbum.set(img.albumId, []);
			}
			albumImagesByAlbum.get(img.albumId)!.push(img);
		}

		const playlistedTracks: PlaylistedTrack<Track>[] = playlistTrackRows.map(
			(row) => {
				const trackArtistList = (
					trackArtistsByTrack.get(row.track.spotifyId) ?? []
				)
					.sort((a, b) => a.position - b.position)
					.map((ta) => ({
						id: ta.artistId,
						name: ta.artistName,
						uri: ta.artistUri,
						type: ta.artistType,
						href: ta.artistHref ?? "",
						external_urls: (ta.artistExternalUrls as { spotify: string }) ?? {
							spotify: "",
						},
					}));

				const albumArtistList = (
					albumArtistsByAlbum.get(row.album.spotifyId) ?? []
				)
					.sort((a, b) => a.position - b.position)
					.map((aa) => ({
						id: aa.artistId,
						name: aa.artistName,
						uri: aa.artistUri,
						type: aa.artistType,
						href: aa.artistHref ?? "",
						external_urls: (aa.artistExternalUrls as { spotify: string }) ?? {
							spotify: "",
						},
					}));

				const albumImgs = reconstructImages(
					albumImagesByAlbum.get(row.album.spotifyId) ?? [],
				);

				const track: Track = {
					id: row.track.spotifyId,
					name: row.track.name,
					uri: row.track.uri,
					duration_ms: row.track.durationMs,
					popularity: row.track.popularity ?? 0,
					explicit: row.track.explicit,
					preview_url: row.track.previewUrl,
					disc_number: row.track.discNumber,
					track_number: row.track.trackNumber,
					is_local: row.track.isLocal,
					href: row.track.href ?? "",
					type: row.track.type,
					external_ids: (row.track.externalIds as {
						isrc?: string;
						ean?: string;
						upc?: string;
					}) ?? {},
					external_urls: (row.track.externalUrls as { spotify: string }) ?? {
						spotify: "",
					},
					available_markets: (row.track.availableMarkets as string[]) ?? [],
					artists: trackArtistList,
					album: {
						id: row.album.spotifyId,
						name: row.album.name,
						uri: row.album.uri,
						album_type: row.album.albumType,
						total_tracks: row.album.totalTracks,
						release_date: row.album.releaseDate,
						release_date_precision: row.album.releaseDatePrecision,
						href: row.album.href ?? "",
						type: row.album.type,
						external_urls: (row.album.externalUrls as { spotify: string }) ?? {
							spotify: "",
						},
						images: albumImgs,
						artists: albumArtistList,
						album_group: "album",
						available_markets: (row.album.availableMarkets as string[]) ?? [],
					},
					episode: false,
					track: true,
				};

				return {
					added_at: row.playlistTrack.addedAt.toISOString(),
					added_by: {
						id: row.playlistTrack.addedByUserId ?? "",
						type: "user",
						uri: "",
						href: "",
						external_urls: { spotify: "" },
					},
					is_local: false,
					primary_color: "",
					track,
				};
			},
		);

		const simplifiedPlaylist: SimplifiedPlaylist = {
			id: playlist.spotifyId,
			name: playlist.name,
			uri: playlist.uri,
			description: playlist.description ?? "",
			collaborative: playlist.collaborative,
			public: playlist.public,
			snapshot_id: playlist.snapshotId,
			href: playlist.href ?? "",
			type: playlist.type,
			primary_color: playlist.primaryColor ?? "",
			followers: (playlist.followers as {
				href: string | null;
				total: number;
			}) ?? { href: null, total: 0 },
			external_urls: (playlist.externalUrls as { spotify: string }) ?? {
				spotify: "",
			},
			images: reconstructImages(playlistImgs),
			owner: {
				id: playlist.ownerId,
				display_name: playlist.ownerDisplayName ?? "",
				type: "user",
				uri: "",
				href: "",
				external_urls: { spotify: "" },
			},
			tracks: null,
		};

		result.push({
			playlist: simplifiedPlaylist,
			tracks: playlistedTracks,
		});
	}

	return result;
}

// Main function to get all Spotify data from database
export async function getSpotifyDataFromDb(userId: string) {
	const [user, savedTracks, playlistsWithTracks, artists] = await Promise.all([
		getCurrentUser(),
		getSavedTracks(userId),
		getPlaylistsWithTracks(userId),
		getAllArtists(),
	]);

	if (!user) {
		throw new Error("User not found in database");
	}

	return {
		user,
		savedTracks,
		playlistsWithTracks,
		albumsWithTracks: [], // Not needed for current analytics
		artists,
	};
}
