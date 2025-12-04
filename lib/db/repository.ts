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
import { sql } from "bun";
import type { SpotifyData } from "../spotify-fetching";

export class SpotifyRepository {
	// === User Operations ===

	async upsertUser(userId: string, profile: UserProfile): Promise<void> {
		await sql`
      INSERT INTO users (id, data, updated_at)
      VALUES (${userId}, ${JSON.stringify(profile)}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET data = ${JSON.stringify(profile)}, updated_at = NOW()
    `;
	}

	async getUser(userId: string): Promise<UserProfile | null> {
		const rows = await sql<{ data: UserProfile }[]>`
      SELECT data FROM users WHERE id = ${userId}
    `;
		return rows[0]?.data || null;
	}

	// === Saved Tracks Operations ===

	async getLastSavedTrackTimestamp(userId: string): Promise<Date | null> {
		const rows = await sql<{ added_at: Date }[]>`
      SELECT added_at
      FROM saved_tracks
      WHERE user_id = ${userId}
      ORDER BY added_at DESC
      LIMIT 1
    `;
		return rows[0]?.added_at || null;
	}

	async insertSavedTracks(userId: string, tracks: SavedTrack[]): Promise<void> {
		if (tracks.length === 0) return;

		// Insert in chunks to avoid query size limits
		const CHUNK_SIZE = 100;
		for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
			const chunk = tracks.slice(i, i + CHUNK_SIZE);

			for (const track of chunk) {
				await sql`
          INSERT INTO saved_tracks (user_id, track_id, added_at, data)
          VALUES (
            ${userId},
            ${track.track.id},
            ${new Date(track.added_at)},
            ${JSON.stringify(track)}
          )
          ON CONFLICT (user_id, track_id) DO NOTHING
        `;
			}
		}
	}

	async getSavedTracks(userId: string): Promise<SavedTrack[]> {
		const rows = await sql<{ data: SavedTrack }[]>`
      SELECT data
      FROM saved_tracks
      WHERE user_id = ${userId}
      ORDER BY added_at DESC
    `;
		return rows.map((r) => r.data);
	}

	async deleteSavedTracks(userId: string, trackIds: string[]): Promise<void> {
		if (trackIds.length === 0) return;

		await sql`
      DELETE FROM saved_tracks
      WHERE user_id = ${userId}
      AND track_id = ANY(${trackIds})
    `;
	}

	// === Playlist Operations ===

	async getPlaylistSnapshots(userId: string): Promise<Map<string, string>> {
		const rows = await sql<{ playlist_id: string; snapshot_id: string }[]>`
      SELECT playlist_id, snapshot_id
      FROM playlists
      WHERE user_id = ${userId}
    `;
		return new Map(rows.map((r) => [r.playlist_id, r.snapshot_id]));
	}

	async upsertPlaylist(
		userId: string,
		playlistId: string,
		snapshotId: string,
		playlist: SimplifiedPlaylist,
	): Promise<void> {
		await sql`
      INSERT INTO playlists (user_id, playlist_id, snapshot_id, data)
      VALUES (${userId}, ${playlistId}, ${snapshotId}, ${JSON.stringify(playlist)})
      ON CONFLICT (user_id, playlist_id)
      DO UPDATE SET
        snapshot_id = ${snapshotId},
        data = ${JSON.stringify(playlist)},
        fetched_at = NOW()
    `;
	}

	async insertPlaylistTracks(
		userId: string,
		playlistId: string,
		tracks: PlaylistedTrack<Track>[],
	): Promise<void> {
		if (tracks.length === 0) return;

		// First, delete existing tracks for this playlist
		await sql`
      DELETE FROM playlist_tracks
      WHERE user_id = ${userId} AND playlist_id = ${playlistId}
    `;

		// Then insert new tracks
		const CHUNK_SIZE = 100;
		for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
			const chunk = tracks.slice(i, i + CHUNK_SIZE);

			for (let j = 0; j < chunk.length; j++) {
				const track = chunk[j];
				const position = i + j;

				await sql`
          INSERT INTO playlist_tracks (user_id, playlist_id, track_id, position, added_at, data)
          VALUES (
            ${userId},
            ${playlistId},
            ${track.track.id},
            ${position},
            ${track.added_at ? new Date(track.added_at) : null},
            ${JSON.stringify(track)}
          )
        `;
			}
		}
	}

	async getPlaylists(userId: string): Promise<SimplifiedPlaylist[]> {
		const rows = await sql<{ data: SimplifiedPlaylist }[]>`
      SELECT data FROM playlists WHERE user_id = ${userId}
    `;
		return rows.map((r) => r.data);
	}

	async getPlaylistTracks(
		userId: string,
		playlistId: string,
	): Promise<PlaylistedTrack<Track>[]> {
		const rows = await sql<{ data: PlaylistedTrack<Track> }[]>`
      SELECT data
      FROM playlist_tracks
      WHERE user_id = ${userId} AND playlist_id = ${playlistId}
      ORDER BY position
    `;
		return rows.map((r) => r.data);
	}

	async deletePlaylist(userId: string, playlistId: string): Promise<void> {
		// Cascade will handle playlist_tracks deletion
		await sql`
      DELETE FROM playlists
      WHERE user_id = ${userId} AND playlist_id = ${playlistId}
    `;
	}

	// === Album Operations ===

	async upsertAlbums(userId: string, albums: Album[]): Promise<void> {
		if (albums.length === 0) return;

		const CHUNK_SIZE = 50;
		for (let i = 0; i < albums.length; i += CHUNK_SIZE) {
			const chunk = albums.slice(i, i + CHUNK_SIZE);

			for (const album of chunk) {
				await sql`
          INSERT INTO albums (user_id, album_id, data)
          VALUES (${userId}, ${album.id}, ${JSON.stringify(album)})
          ON CONFLICT (user_id, album_id)
          DO UPDATE SET data = ${JSON.stringify(album)}, fetched_at = NOW()
        `;
			}
		}
	}

	async insertAlbumTracks(
		userId: string,
		albumId: string,
		tracks: SimplifiedTrack[],
	): Promise<void> {
		if (tracks.length === 0) return;

		// Delete existing tracks
		await sql`
      DELETE FROM album_tracks
      WHERE user_id = ${userId} AND album_id = ${albumId}
    `;

		// Insert new tracks
		for (let i = 0; i < tracks.length; i++) {
			const track = tracks[i];
			await sql`
        INSERT INTO album_tracks (user_id, album_id, track_id, position, data)
        VALUES (
          ${userId},
          ${albumId},
          ${track.id},
          ${i},
          ${JSON.stringify(track)}
        )
      `;
		}
	}

	async getAlbumsWithTracks(userId: string): Promise<
		Array<{
			album: Album;
			tracks: SimplifiedTrack[];
		}>
	> {
		const albums = await sql<{ album_id: string; album_data: Album }[]>`
      SELECT
        album_id,
        data as album_data
      FROM albums
      WHERE user_id = ${userId}
    `;

		const result = await Promise.all(
			albums.map(async ({ album_id, album_data }) => {
				const trackRows = await sql<{ data: SimplifiedTrack }[]>`
          SELECT data
          FROM album_tracks
          WHERE user_id = ${userId} AND album_id = ${album_id}
          ORDER BY position
        `;

				return {
					album: album_data,
					tracks: trackRows.map((r) => r.data),
				};
			}),
		);

		return result;
	}

	// === Artist Operations ===

	async upsertArtists(userId: string, artists: Artist[]): Promise<void> {
		if (artists.length === 0) return;

		const CHUNK_SIZE = 50;
		for (let i = 0; i < artists.length; i += CHUNK_SIZE) {
			const chunk = artists.slice(i, i + CHUNK_SIZE);

			for (const artist of chunk) {
				await sql`
          INSERT INTO artists (user_id, artist_id, data)
          VALUES (${userId}, ${artist.id}, ${JSON.stringify(artist)})
          ON CONFLICT (user_id, artist_id)
          DO UPDATE SET data = ${JSON.stringify(artist)}, fetched_at = NOW()
        `;
			}
		}
	}

	async getArtists(userId: string): Promise<Artist[]> {
		const rows = await sql<{ data: Artist }[]>`
      SELECT data FROM artists WHERE user_id = ${userId}
    `;
		return rows.map((r) => r.data);
	}

	// === Fetch Metadata Operations ===

	async updateFetchMetadata(
		userId: string,
		dataType: string,
		status: "idle" | "in_progress" | "error",
		errorMessage?: string,
	): Promise<void> {
		if (status === "in_progress") {
			await sql`
        INSERT INTO fetch_metadata (user_id, data_type, status, last_fetch_started_at)
        VALUES (${userId}, ${dataType}, ${status}, NOW())
        ON CONFLICT (user_id, data_type)
        DO UPDATE SET status = ${status}, last_fetch_started_at = NOW()
      `;
		} else if (status === "idle") {
			await sql`
        INSERT INTO fetch_metadata (user_id, data_type, status, last_fetch_completed_at)
        VALUES (${userId}, ${dataType}, ${status}, NOW())
        ON CONFLICT (user_id, data_type)
        DO UPDATE SET
          status = ${status},
          last_fetch_completed_at = NOW(),
          error_message = NULL
      `;
		} else {
			await sql`
        INSERT INTO fetch_metadata (user_id, data_type, status, error_message)
        VALUES (${userId}, ${dataType}, ${status}, ${errorMessage})
        ON CONFLICT (user_id, data_type)
        DO UPDATE SET
          status = ${status},
          error_message = ${errorMessage}
      `;
		}
	}

	async getFetchMetadata(
		userId: string,
		dataType: string,
	): Promise<{
		last_fetch_completed_at: Date | null;
		status: string;
	} | null> {
		const rows = await sql<
			{
				last_fetch_completed_at: Date | null;
				status: string;
			}[]
		>`
      SELECT last_fetch_completed_at, status
      FROM fetch_metadata
      WHERE user_id = ${userId} AND data_type = ${dataType}
    `;
		return rows[0] || null;
	}

	// === Composite Query: Get All Data (matches SpotifyData interface) ===

	async getAllData(userId: string): Promise<SpotifyData | null> {
		const user = await this.getUser(userId);
		if (!user) return null;

		const [savedTracks, playlists, albumsWithTracks, artists] =
			await Promise.all([
				this.getSavedTracks(userId),
				this.getPlaylists(userId),
				this.getAlbumsWithTracks(userId),
				this.getArtists(userId),
			]);

		// Build playlistsWithTracks structure
		const playlistsWithTracks = await Promise.all(
			playlists.map(async (playlist) => ({
				playlist,
				tracks: await this.getPlaylistTracks(userId, playlist.id),
			})),
		);

		return {
			user,
			savedTracks,
			playlistsWithTracks,
			albumsWithTracks,
			artists,
		};
	}
}
