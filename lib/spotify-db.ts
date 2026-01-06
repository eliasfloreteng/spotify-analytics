import type {
	Album,
	Artist,
	PlaylistedTrack,
	SavedTrack,
	SimplifiedPlaylist,
	Track,
	UserProfile,
} from "@spotify/web-api-ts-sdk";
import { eq, inArray } from "drizzle-orm";
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

// Save functions for each entity type

export async function saveUser(user: UserProfile) {
	await db
		.insert(users)
		.values({
			spotifyId: user.id,
			displayName: user.display_name,
			email: user.email,
			country: user.country,
			product: user.product,
			uri: user.uri,
			href: user.href,
			followers: user.followers,
			externalUrls: user.external_urls,
			explicitContent: user.explicit_content,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: users.spotifyId,
			set: {
				displayName: user.display_name,
				email: user.email,
				country: user.country,
				product: user.product,
				uri: user.uri,
				href: user.href,
				followers: user.followers,
				externalUrls: user.external_urls,
				explicitContent: user.explicit_content,
				updatedAt: new Date(),
			},
		});

	// Save user images
	if (user.images && user.images.length > 0) {
		await db.delete(userImages).where(eq(userImages.userId, user.id));
		await db.insert(userImages).values(
			user.images.map((img, idx) => ({
				userId: user.id,
				url: img.url,
				height: img.height,
				width: img.width,
				position: idx,
			})),
		);
	}
}

export async function saveArtist(artist: Artist) {
	await db
		.insert(artists)
		.values({
			spotifyId: artist.id,
			name: artist.name,
			uri: artist.uri,
			popularity: artist.popularity,
			href: artist.href,
			type: artist.type,
			followers: artist.followers,
			externalUrls: artist.external_urls,
			genres: artist.genres,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: artists.spotifyId,
			set: {
				name: artist.name,
				popularity: artist.popularity,
				followers: artist.followers,
				genres: artist.genres,
				updatedAt: new Date(),
			},
		});

	// Save artist images
	if (artist.images && artist.images.length > 0) {
		await db.delete(artistImages).where(eq(artistImages.artistId, artist.id));
		await db.insert(artistImages).values(
			artist.images.map((img, idx) => ({
				artistId: artist.id,
				url: img.url,
				height: img.height,
				width: img.width,
				position: idx,
			})),
		);
	}
}

export async function saveAlbum(album: Album) {
	await db
		.insert(albums)
		.values({
			spotifyId: album.id,
			name: album.name,
			uri: album.uri,
			albumType: album.album_type,
			totalTracks: album.total_tracks,
			releaseDate: album.release_date,
			releaseDatePrecision: album.release_date_precision,
			label: album.label,
			popularity: album.popularity,
			href: album.href,
			type: album.type,
			externalIds: album.external_ids,
			externalUrls: album.external_urls,
			copyrights: album.copyrights,
			genres: album.genres,
			availableMarkets: album.available_markets,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: albums.spotifyId,
			set: {
				name: album.name,
				popularity: album.popularity,
				label: album.label,
				genres: album.genres,
				updatedAt: new Date(),
			},
		});

	// Save album images
	if (album.images && album.images.length > 0) {
		await db.delete(albumImages).where(eq(albumImages.albumId, album.id));
		await db.insert(albumImages).values(
			album.images.map((img, idx) => ({
				albumId: album.id,
				url: img.url,
				height: img.height,
				width: img.width,
				position: idx,
			})),
		);
	}

	// Save album artists
	await db.delete(albumArtists).where(eq(albumArtists.albumId, album.id));
	await db.insert(albumArtists).values(
		album.artists.map((artist, idx) => ({
			albumId: album.id,
			artistId: artist.id,
			position: idx,
		})),
	);
}

export async function saveTrack(track: Track) {
	await db
		.insert(tracks)
		.values({
			spotifyId: track.id,
			name: track.name,
			uri: track.uri,
			albumId: track.album.id,
			durationMs: track.duration_ms,
			popularity: track.popularity,
			explicit: track.explicit,
			previewUrl: track.preview_url,
			discNumber: track.disc_number,
			trackNumber: track.track_number,
			isLocal: track.is_local,
			href: track.href,
			type: track.type,
			externalIds: track.external_ids,
			externalUrls: track.external_urls,
			availableMarkets: track.available_markets,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: tracks.spotifyId,
			set: {
				name: track.name,
				popularity: track.popularity,
				previewUrl: track.preview_url,
				updatedAt: new Date(),
			},
		});

	// Save track artists
	await db.delete(trackArtists).where(eq(trackArtists.trackId, track.id));
	await db.insert(trackArtists).values(
		track.artists.map((artist, idx) => ({
			trackId: track.id,
			artistId: artist.id,
			position: idx,
		})),
	);

	// Note: Tracks typically don't have their own images in Spotify API
	// They use the album's images instead
}

export async function savePlaylist(
	playlist: SimplifiedPlaylist,
	userId: string,
	playlistTracksData: PlaylistedTrack<Track>[],
) {
	await db
		.insert(playlists)
		.values({
			spotifyId: playlist.id,
			name: playlist.name,
			uri: playlist.uri,
			description: playlist.description,
			ownerId: userId,
			ownerDisplayName: playlist.owner.display_name,
			collaborative: playlist.collaborative,
			public: playlist.public,
			snapshotId: playlist.snapshot_id,
			href: playlist.href,
			type: playlist.type,
			primaryColor: playlist.primary_color,
			followers: playlist.followers,
			externalUrls: playlist.external_urls,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: playlists.spotifyId,
			set: {
				name: playlist.name,
				description: playlist.description,
				snapshotId: playlist.snapshot_id,
				collaborative: playlist.collaborative,
				public: playlist.public,
				followers: playlist.followers,
				updatedAt: new Date(),
			},
		});

	// Save playlist images
	if (playlist.images && playlist.images.length > 0) {
		await db
			.delete(playlistImages)
			.where(eq(playlistImages.playlistId, playlist.id));
		await db.insert(playlistImages).values(
			playlist.images.map((img, idx) => ({
				playlistId: playlist.id,
				url: img.url,
				height: img.height,
				width: img.width,
				position: idx,
			})),
		);
	}

	// Save playlist tracks
	await db
		.delete(playlistTracks)
		.where(eq(playlistTracks.playlistId, playlist.id));

	const validPlaylistTracks = playlistTracksData
		.filter((pt) => pt.track !== null)
		.map((pt, idx) => ({
			playlistId: playlist.id,
			trackId: (pt.track as Track).id,
			addedAt: new Date(pt.added_at),
			addedByUserId: pt.added_by?.id || null,
			addedByDisplayName: null, // AddedBy doesn't have display_name in the API
			position: idx,
		}));

	if (validPlaylistTracks.length > 0) {
		await db.insert(playlistTracks).values(validPlaylistTracks);
	}
}

export async function saveSavedTracks(
	userId: string,
	savedTracksData: SavedTrack[],
) {
	// Clear existing saved tracks for this user
	await db.delete(savedTracks).where(eq(savedTracks.userId, userId));

	const validSavedTracks = savedTracksData
		.filter((st) => st.track !== null)
		.map((st) => ({
			userId,
			trackId: (st.track as Track).id,
			addedAt: new Date(st.added_at),
		}));

	if (validSavedTracks.length > 0) {
		await db.insert(savedTracks).values(validSavedTracks);
	}
}

export async function saveAlbumTracks(
	albumId: string,
	albumTracksData: { id: string; disc_number: number; track_number: number }[],
) {
	await db.delete(albumTracks).where(eq(albumTracks.albumId, albumId));
	if (albumTracksData.length > 0) {
		await db.insert(albumTracks).values(
			albumTracksData.map((track) => ({
				albumId,
				trackId: track.id,
				discNumber: track.disc_number,
				trackNumber: track.track_number,
			})),
		);
	}
}

// Lookup functions to check existing data

export async function getExistingArtistIds(
	artistIds: string[],
): Promise<Set<string>> {
	if (artistIds.length === 0) return new Set();

	const existing = await db
		.select({ spotifyId: artists.spotifyId })
		.from(artists)
		.where(inArray(artists.spotifyId, artistIds));

	return new Set(existing.map((a) => a.spotifyId));
}

export async function getExistingAlbumIds(
	albumIds: string[],
): Promise<Set<string>> {
	if (albumIds.length === 0) return new Set();

	const existing = await db
		.select({ spotifyId: albums.spotifyId })
		.from(albums)
		.where(inArray(albums.spotifyId, albumIds));

	return new Set(existing.map((a) => a.spotifyId));
}

export async function getExistingTrackIds(
	trackIds: string[],
): Promise<Set<string>> {
	if (trackIds.length === 0) return new Set();

	const existing = await db
		.select({ spotifyId: tracks.spotifyId })
		.from(tracks)
		.where(inArray(tracks.spotifyId, trackIds));

	return new Set(existing.map((t) => t.spotifyId));
}
