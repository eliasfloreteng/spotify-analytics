import { MaxInt, SpotifyApi } from "@spotify/web-api-ts-sdk"

export async function fetchSpotifyLikedSongs(
  sdk: SpotifyApi,
  offset: number,
  limit: MaxInt<50> = 50,
) {
  return await sdk.currentUser.tracks.savedTracks(limit, offset)
}

export async function fetchPlaylists(
  sdk: SpotifyApi,
  offset: number,
  limit: MaxInt<50> = 50,
) {
  return await sdk.currentUser.playlists.playlists(limit, offset)
}

export async function fetchPlaylist(sdk: SpotifyApi, playlistId: string) {
  return await sdk.playlists.getPlaylist(playlistId)
}

export async function fetchPlaylistTracks(
  sdk: SpotifyApi,
  playlistId: string,
  offset: number = 0,
  limit: MaxInt<50> = 50,
) {
  return await sdk.playlists.getPlaylistItems(
    playlistId,
    undefined,
    undefined,
    limit,
    offset,
  )
}

export async function fetchUser(sdk: SpotifyApi) {
  return sdk.currentUser.profile()
}
