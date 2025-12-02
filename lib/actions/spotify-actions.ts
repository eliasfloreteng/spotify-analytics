import type {
	SpotifyApi,
	Track,
	Artist,
	SavedTrack,
	PlaylistedTrack,
	SimplifiedPlaylist,
} from "@spotify/web-api-ts-sdk"
import { getSpotifyServerClient } from "../spotify-server"
import {
	getCached,
	setCached,
	getCachedMany,
	setCachedMany,
	getCacheKey,
} from "../redis"
import PQueue from "p-queue"

// Re-export types for client use
export type { Track, Artist, SavedTrack, PlaylistedTrack, SimplifiedPlaylist }

export type CombinedTrack =
	| ({ source: "liked" } & SavedTrack)
	| ({
			source: "playlist"
			playlist: SimplifiedPlaylist
	  } & PlaylistedTrack<Track>)

export interface FetchProgress {
	phase:
		| "user"
		| "liked-songs"
		| "playlists"
		| "playlist-tracks"
		| "artists"
		| "deduplication"
		| "complete"
	current: number
	total: number
	percentage: number
	message: string
}

export interface FetchAllDataResult {
	tracks: CombinedTrack[]
	user: any
	artists: Record<string, Artist>
	errors: any[]
	stats: {
		totalLikedSongs: number
		totalPlaylists: number
		totalPlaylistTracks: number
		totalTracks: number
		totalArtists: number
	}
}

export async function checkAuthentication(): Promise<boolean> {
	return await isAuthenticated()
}

async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries = 5,
	initialDelay = 1000,
): Promise<T> {
	let lastError: any

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error: any) {
			lastError = error

			const isRateLimit =
				error?.status === 429 ||
				error?.response?.status === 429 ||
				error?.message?.includes("429")

			if (isRateLimit && attempt < maxRetries) {
				const retryAfter = error?.response?.headers?.["retry-after"]
				const delay = retryAfter
					? parseInt(retryAfter) * 1000
					: initialDelay * Math.pow(2, attempt)

				await new Promise((resolve) => setTimeout(resolve, delay))
				continue
			}

			if (attempt < maxRetries) {
				const delay = initialDelay * Math.pow(2, attempt)
				await new Promise((resolve) => setTimeout(resolve, delay))
				continue
			}

			throw lastError
		}
	}

	throw lastError
}

export async function fetchUserProfile() {
	const sdk = await getSpotifyServerClient()
	if (!sdk) {
		throw new Error("Not authenticated")
	}

	const cacheKey = getCacheKey("user", "profile")
	const cached = await getCached<any>(cacheKey)
	if (cached) {
		return cached
	}

	const user = await sdk.currentUser.profile()
	await setCached(cacheKey, user, CACHE_TTL.USER_DATA)

	return user
}

export async function fetchTrack(trackId: string): Promise<Track | null> {
	const sdk = await getSpotifyServerClient()
	if (!sdk) {
		throw new Error("Not authenticated")
	}

	const cacheKey = getCacheKey("track", trackId)
	const cached = await getCached<Track>(cacheKey)
	if (cached) {
		return cached
	}

	try {
		const track = await sdk.tracks.get(trackId)
		await setCached(cacheKey, track, CACHE_TTL.TRACK)
		return track
	} catch (error) {
		console.error(`Error fetching track ${trackId}:`, error)
		return null
	}
}

export async function fetchArtist(artistId: string): Promise<Artist | null> {
	const sdk = await getSpotifyServerClient()
	if (!sdk) {
		throw new Error("Not authenticated")
	}

	const cacheKey = getCacheKey("artist", artistId)
	const cached = await getCached<Artist>(cacheKey)
	if (cached) {
		return cached
	}

	try {
		const artist = await sdk.artists.get([artistId])
		const artistData = artist[0]
		if (artistData) {
			await setCached(cacheKey, artistData, CACHE_TTL.ARTIST)
		}
		return artistData || null
	} catch (error) {
		console.error(`Error fetching artist ${artistId}:`, error)
		return null
	}
}

export async function fetchArtists(
	artistIds: string[],
): Promise<Record<string, Artist>> {
	const sdk = await getSpotifyServerClient()
	if (!sdk) {
		throw new Error("Not authenticated")
	}

	const cacheKeys = artistIds.map((id) => getCacheKey("artist", id))
	const cachedArtists = await getCachedMany<Artist>(cacheKeys)

	const artistsMap: Record<string, Artist> = {}
	const missingIds: string[] = []

	artistIds.forEach((id, index) => {
		const cached = cachedArtists[index]
		if (cached) {
			artistsMap[id] = cached
		} else {
			missingIds.push(id)
		}
	})

	if (missingIds.length > 0) {
		// Fetch missing artists in batches of 50
		const batchSize = 50
		for (let i = 0; i < missingIds.length; i += batchSize) {
			const batch = missingIds.slice(i, i + batchSize)

			try {
				const artists = await retryWithBackoff(() => sdk.artists.get(batch))

				const cacheItems = artists
					.filter((artist) => artist !== null)
					.map((artist) => ({
						key: getCacheKey("artist", artist.id),
						value: artist,
						ttl: CACHE_TTL.ARTIST,
					}))

				await setCachedMany(cacheItems)

				artists.forEach((artist) => {
					if (artist) {
						artistsMap[artist.id] = artist
					}
				})
			} catch (error) {
				console.error("Error fetching artist batch:", error)
			}
		}
	}

	return artistsMap
}

export async function fetchAlbum(albumId: string) {
	const sdk = await getSpotifyServerClient()
	if (!sdk) {
		throw new Error("Not authenticated")
	}

	const cacheKey = getCacheKey("album", albumId)
	const cached = await getCached<any>(cacheKey)
	if (cached) {
		return cached
	}

	try {
		const album = await sdk.albums.get(albumId)
		await setCached(cacheKey, album, CACHE_TTL.ALBUM)
		return album
	} catch (error) {
		console.error(`Error fetching album ${albumId}:`, error)
		return null
	}
}

async function fetchLikedSongs(sdk: SpotifyApi, offset: number) {
	return await sdk.currentUser.tracks.savedTracks(50, offset)
}

async function fetchPlaylists(sdk: SpotifyApi, offset: number) {
	return await sdk.currentUser.playlists.playlists(50, offset)
}

async function fetchPlaylistTracks(
	sdk: SpotifyApi,
	playlistId: string,
	offset: number,
) {
	return await sdk.playlists.getPlaylistItems(
		playlistId,
		undefined,
		undefined,
		50,
		offset,
	)
}

export async function fetchAllSpotifyData(): Promise<FetchAllDataResult> {
	const sdk = await getSpotifyServerClient()
	if (!sdk) {
		throw new Error("Not authenticated")
	}

	const queue = new PQueue({ concurrency: 3 })
	const errors: any[] = []
	const tracks: CombinedTrack[] = []

	let user: any = null
	let totalLikedSongs = 0
	let totalPlaylists = 0
	let totalPlaylistTracks = 0
	const artistsMap = new Map<string, Artist>()

	// Step 1: Fetch user profile
	try {
		user = await retryWithBackoff(() => fetchUserProfile())
	} catch (error) {
		errors.push({ type: "user", error })
	}

	// Step 2: Fetch liked songs
	try {
		const firstPage = await retryWithBackoff(() => fetchLikedSongs(sdk, 0))
		totalLikedSongs = firstPage.total

		firstPage.items.forEach((item) => {
			tracks.push({
				source: "liked",
				track: item.track,
				added_at: item.added_at,
			})
		})

		const limit = 50
		const totalPages = Math.ceil(totalLikedSongs / limit)
		const likedSongsPromises: Promise<void>[] = []

		for (let page = 1; page < totalPages; page++) {
			const offset = page * limit
			likedSongsPromises.push(
				queue.add(async () => {
					try {
						const pageData = await retryWithBackoff(() =>
							fetchLikedSongs(sdk, offset),
						)
						pageData.items.forEach((item) => {
							tracks.push({
								source: "liked",
								...item,
							})
						})
					} catch (error) {
						errors.push({ type: "liked-songs", error, context: { offset } })
					}
				}),
			)
		}

		await Promise.all(likedSongsPromises)
	} catch (error) {
		errors.push({ type: "liked-songs", error })
	}

	// Step 3: Fetch playlists
	const userPlaylists: SimplifiedPlaylist[] = []
	try {
		const firstPage = await retryWithBackoff(() => fetchPlaylists(sdk, 0))
		const totalPlaylistsCount = firstPage.total

		if (user) {
			firstPage.items.forEach((playlist) => {
				if (playlist.owner.id === user.id) {
					userPlaylists.push(playlist)
				}
			})
		}

		const limit = 50
		const totalPages = Math.ceil(totalPlaylistsCount / limit)
		const playlistPromises: Promise<void>[] = []

		for (let page = 1; page < totalPages; page++) {
			const offset = page * limit
			playlistPromises.push(
				queue.add(async () => {
					try {
						const pageData = await retryWithBackoff(() =>
							fetchPlaylists(sdk, offset),
						)
						if (user) {
							pageData.items.forEach((playlist) => {
								if (playlist.owner.id === user.id) {
									userPlaylists.push(playlist)
								}
							})
						}
					} catch (error) {
						errors.push({ type: "playlists", error, context: { offset } })
					}
				}),
			)
		}

		await Promise.all(playlistPromises)
		totalPlaylists = userPlaylists.length
	} catch (error) {
		errors.push({ type: "playlists", error })
	}

	// Step 4: Fetch tracks from user playlists
	if (userPlaylists.length > 0) {
		let fetchedPlaylistTracksCount = 0
		const playlistTrackPromises: Promise<void>[] = []

		for (const playlist of userPlaylists) {
			playlistTrackPromises.push(
				queue.add(async () => {
					try {
						const firstPage = await retryWithBackoff(() =>
							fetchPlaylistTracks(sdk, playlist.id, 0),
						)
						const playlistTotal = firstPage.total

						firstPage.items.forEach((item) => {
							tracks.push({
								...item,
								source: "playlist",
								playlist: playlist,
							})
							fetchedPlaylistTracksCount++
						})

						const limit = 50
						const totalPages = Math.ceil(playlistTotal / limit)

						for (let page = 1; page < totalPages; page++) {
							const offset = page * limit
							try {
								const pageData = await retryWithBackoff(() =>
									fetchPlaylistTracks(sdk, playlist.id, offset),
								)
								pageData.items.forEach((item) => {
									tracks.push({
										...item,
										source: "playlist",
										playlist: playlist,
									})
									fetchedPlaylistTracksCount++
								})
							} catch (error) {
								errors.push({
									type: "playlist-tracks",
									error,
									context: { playlistId: playlist.id, offset },
								})
							}
						}
					} catch (error) {
						errors.push({
							type: "playlist-tracks",
							error,
							context: { playlistId: playlist.id },
						})
					}
				}),
			)
		}

		await Promise.all(playlistTrackPromises)
		totalPlaylistTracks = fetchedPlaylistTracksCount
	}

	// Step 5: Fetch artist details with genres
	const uniqueArtistIds = new Set<string>()
	tracks.forEach((track) => {
		if (track.track && track.track.artists) {
			track.track.artists.forEach((artist) => {
				if (artist && artist.id) {
					uniqueArtistIds.add(artist.id)
				}
			})
		}
	})

	const artistIds = Array.from(uniqueArtistIds)

	if (artistIds.length > 0) {
		const artistsRecord = await fetchArtists(artistIds)
		Object.entries(artistsRecord).forEach(([id, artist]) => {
			artistsMap.set(id, artist)
		})
	}

	return {
		tracks,
		user,
		artists: Object.fromEntries(artistsMap),
		errors,
		stats: {
			totalLikedSongs,
			totalPlaylists,
			totalPlaylistTracks,
			totalTracks: tracks.length,
			totalArtists: artistsMap.size,
		},
	}
}
