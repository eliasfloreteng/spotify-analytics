import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
	spotifyId: varchar("spotify_id", { length: 255 }).primaryKey(),
	displayName: varchar("display_name", { length: 255 }),
	email: varchar("email", { length: 255 }),
	country: varchar("country", { length: 10 }),
	product: varchar("product", { length: 50 }), // free, premium, etc.
	uri: varchar("uri", { length: 255 }).notNull(),
	href: varchar("href", { length: 500 }),
	followers: jsonb("followers").$type<{ href: string | null; total: number }>(),
	externalUrls: jsonb("external_urls").$type<{ spotify: string }>(),
	explicitContent: jsonb("explicit_content").$type<{
		filter_enabled: boolean;
		filter_locked: boolean;
	}>(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Albums table
export const albums = pgTable(
	"albums",
	{
		spotifyId: varchar("spotify_id", { length: 255 }).primaryKey(),
		name: varchar("name", { length: 500 }).notNull(),
		uri: varchar("uri", { length: 255 }).notNull(),
		albumType: varchar("album_type", { length: 50 }).notNull(), // album, single, compilation
		totalTracks: integer("total_tracks").notNull(),
		releaseDate: varchar("release_date", { length: 50 }).notNull(),
		releaseDatePrecision: varchar("release_date_precision", {
			length: 20,
		}).notNull(), // year, month, day
		label: varchar("label", { length: 255 }),
		popularity: integer("popularity"),
		href: varchar("href", { length: 500 }),
		type: varchar("type", { length: 50 }).notNull(),
		externalIds: jsonb("external_ids").$type<{ upc?: string }>(),
		externalUrls: jsonb("external_urls").$type<{ spotify: string }>(),
		copyrights:
			jsonb("copyrights").$type<Array<{ text: string; type: string }>>(),
		genres: text("genres").array(),
		availableMarkets: text("available_markets").array(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("album_name_idx").on(table.name),
		index("album_release_date_idx").on(table.releaseDate),
	],
);

// Artists table
export const artists = pgTable(
	"artists",
	{
		spotifyId: varchar("spotify_id", { length: 255 }).primaryKey(),
		name: varchar("name", { length: 500 }).notNull(),
		uri: varchar("uri", { length: 255 }).notNull(),
		popularity: integer("popularity"),
		href: varchar("href", { length: 500 }),
		type: varchar("type", { length: 50 }).notNull(),
		followers: jsonb("followers").$type<{
			href: string | null;
			total: number;
		}>(),
		externalUrls: jsonb("external_urls").$type<{ spotify: string }>(),
		genres: text("genres").array(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("artist_name_idx").on(table.name)],
);

// Tracks table
export const tracks = pgTable(
	"tracks",
	{
		spotifyId: varchar("spotify_id", { length: 255 }).primaryKey(),
		name: varchar("name", { length: 500 }).notNull(),
		uri: varchar("uri", { length: 255 }).notNull(),
		albumId: varchar("album_id", { length: 255 })
			.notNull()
			.references(() => albums.spotifyId, { onDelete: "cascade" }),
		durationMs: integer("duration_ms").notNull(),
		popularity: integer("popularity"),
		explicit: boolean("explicit").notNull(),
		previewUrl: varchar("preview_url", { length: 500 }), // nullable
		discNumber: integer("disc_number").notNull(),
		trackNumber: integer("track_number").notNull(),
		isLocal: boolean("is_local").notNull().default(false),
		href: varchar("href", { length: 500 }),
		type: varchar("type", { length: 50 }).notNull(),
		externalIds: jsonb("external_ids").$type<{
			isrc?: string;
			ean?: string;
			upc?: string;
		}>(),
		externalUrls: jsonb("external_urls").$type<{ spotify: string }>(),
		availableMarkets: text("available_markets").array(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("track_album_id_idx").on(table.albumId),
		index("track_name_idx").on(table.name),
	],
);

// Playlists table
export const playlists = pgTable(
	"playlists",
	{
		spotifyId: varchar("spotify_id", { length: 255 }).primaryKey(),
		name: varchar("name", { length: 500 }).notNull(),
		uri: varchar("uri", { length: 255 }).notNull(),
		description: text("description"),
		ownerId: varchar("owner_id", { length: 255 })
			.notNull()
			.references(() => users.spotifyId, { onDelete: "cascade" }),
		ownerDisplayName: varchar("owner_display_name", { length: 255 }), // denormalized for convenience
		collaborative: boolean("collaborative").notNull(),
		public: boolean("public").notNull(),
		snapshotId: varchar("snapshot_id", { length: 255 }).notNull(), // for detecting changes
		href: varchar("href", { length: 500 }),
		type: varchar("type", { length: 50 }).notNull(),
		primaryColor: varchar("primary_color", { length: 20 }),
		followers: jsonb("followers").$type<{
			href: string | null;
			total: number;
		}>(),
		externalUrls: jsonb("external_urls").$type<{ spotify: string }>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("playlist_owner_id_idx").on(table.ownerId),
		index("playlist_snapshot_id_idx").on(table.snapshotId),
	],
);

// Track-Artist junction table (many-to-many)
export const trackArtists = pgTable(
	"track_artists",
	{
		trackId: varchar("track_id", { length: 255 })
			.notNull()
			.references(() => tracks.spotifyId, { onDelete: "cascade" }),
		artistId: varchar("artist_id", { length: 255 })
			.notNull()
			.references(() => artists.spotifyId, { onDelete: "cascade" }),
		position: integer("position").notNull(), // order of artists on track
	},
	(table) => [
		primaryKey({ columns: [table.trackId, table.artistId, table.position] }),
		index("track_artist_artist_id_idx").on(table.artistId),
	],
);

// Album-Artist junction table (many-to-many)
export const albumArtists = pgTable(
	"album_artists",
	{
		albumId: varchar("album_id", { length: 255 })
			.notNull()
			.references(() => albums.spotifyId, { onDelete: "cascade" }),
		artistId: varchar("artist_id", { length: 255 })
			.notNull()
			.references(() => artists.spotifyId, { onDelete: "cascade" }),
		position: integer("position").notNull(), // order of artists on album
	},
	(table) => [
		primaryKey({ columns: [table.albumId, table.artistId, table.position] }),
		index("album_artist_artist_id_idx").on(table.artistId),
	],
);

// Album-Track relationship
export const albumTracks = pgTable(
	"album_tracks",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		albumId: varchar("album_id", { length: 255 })
			.notNull()
			.references(() => albums.spotifyId, { onDelete: "cascade" }),
		trackId: varchar("track_id", { length: 255 })
			.notNull()
			.references(() => tracks.spotifyId, { onDelete: "cascade" }),
		discNumber: integer("disc_number").notNull(),
		trackNumber: integer("track_number").notNull(),
	},
	(table) => [
		uniqueIndex("album_track_unique_idx").on(table.albumId, table.trackId),
		index("album_track_album_id_idx").on(table.albumId),
		index("album_track_track_id_idx").on(table.trackId),
	],
);

// Playlist-Track junction table
export const playlistTracks = pgTable(
	"playlist_tracks",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		playlistId: varchar("playlist_id", { length: 255 })
			.notNull()
			.references(() => playlists.spotifyId, { onDelete: "cascade" }),
		trackId: varchar("track_id", { length: 255 })
			.notNull()
			.references(() => tracks.spotifyId, { onDelete: "cascade" }),
		addedAt: timestamp("added_at").notNull(),
		addedByUserId: varchar("added_by_user_id", { length: 255 }), // nullable - user might not be in system
		addedByDisplayName: varchar("added_by_display_name", { length: 255 }),
		position: integer("position").notNull(), // order in playlist
	},
	(table) => [
		index("playlist_track_playlist_id_idx").on(table.playlistId),
		index("playlist_track_track_id_idx").on(table.trackId),
		index("playlist_track_added_at_idx").on(table.addedAt),
		// Allow same track multiple times if added at different times
		uniqueIndex("playlist_track_added_unique_idx").on(
			table.playlistId,
			table.trackId,
			table.addedAt,
		),
	],
);

// Saved tracks (user's library)
export const savedTracks = pgTable(
	"saved_tracks",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.spotifyId, { onDelete: "cascade" }),
		trackId: varchar("track_id", { length: 255 })
			.notNull()
			.references(() => tracks.spotifyId, { onDelete: "cascade" }),
		addedAt: timestamp("added_at").notNull(),
	},
	(table) => [
		uniqueIndex("user_track_unique_idx").on(table.userId, table.trackId),
		index("saved_track_user_id_idx").on(table.userId),
		index("saved_track_track_id_idx").on(table.trackId),
		index("saved_track_added_at_idx").on(table.addedAt),
	],
);

// User images
export const userImages = pgTable(
	"user_images",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.spotifyId, { onDelete: "cascade" }),
		url: varchar("url", { length: 1000 }).notNull(),
		height: integer("height"),
		width: integer("width"),
		position: integer("position").notNull(), // order in images array
	},
	(table) => [
		index("user_image_user_id_idx").on(table.userId),
		uniqueIndex("user_image_url_unique_idx").on(table.userId, table.url),
	],
);

// Track images
export const trackImages = pgTable(
	"track_images",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		trackId: varchar("track_id", { length: 255 })
			.notNull()
			.references(() => tracks.spotifyId, { onDelete: "cascade" }),
		url: varchar("url", { length: 1000 }).notNull(),
		height: integer("height"),
		width: integer("width"),
		position: integer("position").notNull(),
	},
	(table) => [
		index("track_image_track_id_idx").on(table.trackId),
		uniqueIndex("track_image_url_unique_idx").on(table.trackId, table.url),
	],
);

// Album images
export const albumImages = pgTable(
	"album_images",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		albumId: varchar("album_id", { length: 255 })
			.notNull()
			.references(() => albums.spotifyId, { onDelete: "cascade" }),
		url: varchar("url", { length: 1000 }).notNull(),
		height: integer("height"),
		width: integer("width"),
		position: integer("position").notNull(),
	},
	(table) => [
		index("album_image_album_id_idx").on(table.albumId),
		uniqueIndex("album_image_url_unique_idx").on(table.albumId, table.url),
	],
);

// Artist images
export const artistImages = pgTable(
	"artist_images",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		artistId: varchar("artist_id", { length: 255 })
			.notNull()
			.references(() => artists.spotifyId, { onDelete: "cascade" }),
		url: varchar("url", { length: 1000 }).notNull(),
		height: integer("height"),
		width: integer("width"),
		position: integer("position").notNull(),
	},
	(table) => [
		index("artist_image_artist_id_idx").on(table.artistId),
		uniqueIndex("artist_image_url_unique_idx").on(table.artistId, table.url),
	],
);

// Playlist images
export const playlistImages = pgTable(
	"playlist_images",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		playlistId: varchar("playlist_id", { length: 255 })
			.notNull()
			.references(() => playlists.spotifyId, { onDelete: "cascade" }),
		url: varchar("url", { length: 1000 }).notNull(),
		height: integer("height"),
		width: integer("width"),
		position: integer("position").notNull(),
	},
	(table) => [
		index("playlist_image_playlist_id_idx").on(table.playlistId),
		uniqueIndex("playlist_image_url_unique_idx").on(
			table.playlistId,
			table.url,
		),
	],
);
