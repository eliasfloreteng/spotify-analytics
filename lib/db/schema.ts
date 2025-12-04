import { sql } from "bun";

export async function initializeDatabase(): Promise<void> {
	try {
		console.log("Initializing database schema...");

		// Create users table
		await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

		// Create saved_tracks table
		await sql`
      CREATE TABLE IF NOT EXISTS saved_tracks (
        user_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        added_at TIMESTAMPTZ NOT NULL,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, track_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

		// Create playlists table
		await sql`
      CREATE TABLE IF NOT EXISTS playlists (
        user_id TEXT NOT NULL,
        playlist_id TEXT NOT NULL,
        snapshot_id TEXT NOT NULL,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, playlist_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

		// Create playlist_tracks table
		await sql`
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        user_id TEXT NOT NULL,
        playlist_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        added_at TIMESTAMPTZ,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, playlist_id, track_id, position),
        FOREIGN KEY (user_id, playlist_id) REFERENCES playlists(user_id, playlist_id) ON DELETE CASCADE
      )
    `;

		// Create albums table
		await sql`
      CREATE TABLE IF NOT EXISTS albums (
        user_id TEXT NOT NULL,
        album_id TEXT NOT NULL,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, album_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

		// Create album_tracks table
		await sql`
      CREATE TABLE IF NOT EXISTS album_tracks (
        user_id TEXT NOT NULL,
        album_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY (user_id, album_id, track_id),
        FOREIGN KEY (user_id, album_id) REFERENCES albums(user_id, album_id) ON DELETE CASCADE
      )
    `;

		// Create artists table
		await sql`
      CREATE TABLE IF NOT EXISTS artists (
        user_id TEXT NOT NULL,
        artist_id TEXT NOT NULL,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, artist_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

		// Create fetch_metadata table
		await sql`
      CREATE TABLE IF NOT EXISTS fetch_metadata (
        user_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        last_fetch_completed_at TIMESTAMPTZ,
        last_fetch_started_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'idle',
        error_message TEXT,
        PRIMARY KEY (user_id, data_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

		// Create indexes for saved_tracks
		await sql`CREATE INDEX IF NOT EXISTS idx_saved_tracks_user_added ON saved_tracks(user_id, added_at DESC)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_saved_tracks_track_id ON saved_tracks(track_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_saved_tracks_fetched ON saved_tracks(user_id, fetched_at)`;

		// Create indexes for playlist_tracks
		await sql`CREATE INDEX IF NOT EXISTS idx_playlist_tracks_user_playlist ON playlist_tracks(user_id, playlist_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(user_id, playlist_id, position)`;

		// Create indexes for playlists
		await sql`CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_playlists_snapshot ON playlists(user_id, snapshot_id)`;

		// Create indexes for albums
		await sql`CREATE INDEX IF NOT EXISTS idx_albums_user ON albums(user_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_album_tracks_user_album ON album_tracks(user_id, album_id)`;

		// Create indexes for artists
		await sql`CREATE INDEX IF NOT EXISTS idx_artists_user ON artists(user_id)`;

		// Create indexes for fetch_metadata
		await sql`CREATE INDEX IF NOT EXISTS idx_fetch_metadata_user ON fetch_metadata(user_id)`;

		console.log("Database schema initialized successfully");
	} catch (error) {
		console.error("Database initialization failed:", error);
		throw error;
	}
}
