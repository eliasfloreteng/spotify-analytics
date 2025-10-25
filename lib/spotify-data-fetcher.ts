import PQueue from "p-queue"
import {
  SpotifyApi,
  Track,
  UserProfile,
  SimplifiedPlaylist,
  PlaylistedTrack,
  SavedTrack,
} from "@spotify/web-api-ts-sdk"
import {
  fetchSpotifyLikedSongs,
  fetchPlaylists,
  fetchPlaylistTracks,
  fetchUser,
} from "./spotify"

// Discriminated union for track sources
export type CombinedTrack =
  | ({
      source: "liked"
    } & SavedTrack)
  | ({
      source: "playlist"
      playlist: SimplifiedPlaylist
    } & PlaylistedTrack<Track>)

// Progress reporting types
export interface FetchProgress {
  phase: "user" | "liked-songs" | "playlists" | "playlist-tracks" | "complete"
  current: number
  total: number
  percentage: number
  message: string
}

export type ProgressCallback = (progress: FetchProgress) => void

// Error tracking
export interface FetchError {
  type: "user" | "liked-songs" | "playlists" | "playlist-tracks"
  error: any
  context?: any
}

// Final result type
export interface FetchAllDataResult {
  tracks: CombinedTrack[]
  user: UserProfile | null
  errors: FetchError[]
  stats: {
    totalLikedSongs: number
    totalPlaylists: number
    totalPlaylistTracks: number
    totalTracks: number
  }
}

/**
 * Fetches all Spotify data (liked songs, playlists, and tracks) with concurrency control
 * @param sdk - Spotify SDK instance
 * @param onProgress - Optional callback for progress updates
 * @returns Combined data with all tracks and metadata
 */
export async function fetchAllSpotifyData(
  sdk: SpotifyApi,
  onProgress?: ProgressCallback,
): Promise<FetchAllDataResult> {
  const queue = new PQueue({ concurrency: 5 })
  const errors: FetchError[] = []
  const tracks: CombinedTrack[] = []

  let user: UserProfile | null = null
  let totalLikedSongs = 0
  let totalPlaylists = 0
  let totalPlaylistTracks = 0

  const reportProgress = (
    phase: FetchProgress["phase"],
    current: number,
    total: number,
    message: string,
  ) => {
    if (onProgress) {
      onProgress({
        phase,
        current,
        total,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
        message,
      })
    }
  }

  // Step 1: Fetch user profile
  try {
    reportProgress("user", 0, 1, "Fetching user profile...")
    user = await fetchUser(sdk)
    reportProgress("user", 1, 1, "User profile fetched")
  } catch (error) {
    errors.push({ type: "user", error })
    reportProgress("user", 1, 1, "Failed to fetch user profile")
  }

  // Step 2: Fetch liked songs
  try {
    reportProgress("liked-songs", 0, 1, "Fetching liked songs...")

    // Get first page to determine total
    const firstPage = await fetchSpotifyLikedSongs(sdk, 0)
    totalLikedSongs = firstPage.total

    // Add first page tracks
    firstPage.items.forEach((item) => {
      tracks.push({
        source: "liked",
        track: item.track,
        added_at: item.added_at,
      })
    })

    reportProgress(
      "liked-songs",
      firstPage.items.length,
      totalLikedSongs,
      `Fetched ${firstPage.items.length} of ${totalLikedSongs} liked songs`,
    )

    // Calculate remaining pages
    const limit = 50
    const totalPages = Math.ceil(totalLikedSongs / limit)
    let fetchedCount = firstPage.items.length

    // Queue remaining pages
    const likedSongsPromises: Promise<void>[] = []
    for (let page = 1; page < totalPages; page++) {
      const offset = page * limit
      likedSongsPromises.push(
        queue.add(async () => {
          try {
            const pageData = await fetchSpotifyLikedSongs(sdk, offset)
            pageData.items.forEach((item) => {
              tracks.push({
                source: "liked",
                ...item,
              })
            })
            fetchedCount += pageData.items.length
            reportProgress(
              "liked-songs",
              fetchedCount,
              totalLikedSongs,
              `Fetched ${fetchedCount} of ${totalLikedSongs} liked songs`,
            )
          } catch (error) {
            errors.push({
              type: "liked-songs",
              error,
              context: { offset },
            })
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
    reportProgress("playlists", 0, 1, "Fetching playlists...")

    // Get first page to determine total
    const firstPage = await fetchPlaylists(sdk, 0)
    const totalPlaylistsCount = firstPage.total

    // Filter user-created playlists from first page
    if (user) {
      firstPage.items.forEach((playlist) => {
        if (playlist.owner.id === user.id) {
          userPlaylists.push(playlist)
        }
      })
    }

    reportProgress(
      "playlists",
      firstPage.items.length,
      totalPlaylistsCount,
      `Fetched ${firstPage.items.length} of ${totalPlaylistsCount} playlists`,
    )

    // Calculate remaining pages
    const limit = 50
    const totalPages = Math.ceil(totalPlaylistsCount / limit)
    let fetchedPlaylistCount = firstPage.items.length

    // Queue remaining pages
    const playlistPromises: Promise<void>[] = []
    for (let page = 1; page < totalPages; page++) {
      const offset = page * limit
      playlistPromises.push(
        queue.add(async () => {
          try {
            const pageData = await fetchPlaylists(sdk, offset)
            if (user) {
              pageData.items.forEach((playlist) => {
                if (playlist.owner.id === user.id) {
                  userPlaylists.push(playlist)
                }
              })
            }
            fetchedPlaylistCount += pageData.items.length
            reportProgress(
              "playlists",
              fetchedPlaylistCount,
              totalPlaylistsCount,
              `Fetched ${fetchedPlaylistCount} of ${totalPlaylistsCount} playlists`,
            )
          } catch (error) {
            errors.push({
              type: "playlists",
              error,
              context: { offset },
            })
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
    reportProgress(
      "playlist-tracks",
      0,
      1,
      `Fetching tracks from ${userPlaylists.length} playlists...`,
    )

    let processedPlaylists = 0
    let fetchedPlaylistTracksCount = 0

    const playlistTrackPromises: Promise<void>[] = []

    for (const playlist of userPlaylists) {
      playlistTrackPromises.push(
        queue.add(async () => {
          try {
            // Get first page to determine total tracks in this playlist
            const firstPage = await fetchPlaylistTracks(sdk, playlist.id, 0)
            const playlistTotal = firstPage.total

            // Add first page tracks
            firstPage.items.forEach((item) => {
              tracks.push({
                ...item,
                source: "playlist",
                playlist: playlist,
              })
              fetchedPlaylistTracksCount++
            })

            // Calculate remaining pages for this playlist
            const limit = 50
            const totalPages = Math.ceil(playlistTotal / limit)

            // Queue remaining pages for this playlist
            const playlistPagePromises: Promise<void>[] = []
            for (let page = 1; page < totalPages; page++) {
              const offset = page * limit
              playlistPagePromises.push(
                queue.add(async () => {
                  try {
                    const pageData = await fetchPlaylistTracks(
                      sdk,
                      playlist.id,
                      offset,
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
                }),
              )
            }

            await Promise.all(playlistPagePromises)

            processedPlaylists++
            reportProgress(
              "playlist-tracks",
              processedPlaylists,
              userPlaylists.length,
              `Processed ${processedPlaylists} of ${userPlaylists.length} playlists (${fetchedPlaylistTracksCount} tracks)`,
            )
          } catch (error) {
            errors.push({
              type: "playlist-tracks",
              error,
              context: { playlistId: playlist.id },
            })
            processedPlaylists++
          }
        }),
      )
    }

    await Promise.all(playlistTrackPromises)
    totalPlaylistTracks = fetchedPlaylistTracksCount
  }

  // Final progress report
  reportProgress("complete", 1, 1, "All data fetched successfully")

  return {
    tracks,
    user,
    errors,
    stats: {
      totalLikedSongs,
      totalPlaylists,
      totalPlaylistTracks,
      totalTracks: tracks.length,
    },
  }
}
