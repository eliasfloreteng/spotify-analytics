import type { SpotifyTrack } from "./mock-spotify-data"

export interface ProcessedSong extends SpotifyTrack {
  playlistNames: string[]
}

interface SongKey {
  name: string
  artists: string
  album: string
  duration: number
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function createSongKey(song: SpotifyTrack): SongKey {
  return {
    name: normalizeName(song.track.name),
    artists: song.track.artists
      .map((a) => normalizeName(a.name))
      .sort()
      .join("|"),
    album: normalizeName(song.track.album.name),
    duration: Math.round(song.track.duration_ms / 1000), // Round to seconds
  }
}

function areSongsSimilar(key1: SongKey, key2: SongKey): boolean {
  // Must have same artists
  if (key1.artists !== key2.artists) return false

  // Must have same album
  if (key1.album !== key2.album) return false

  // Names must be very similar (exact match after normalization)
  if (key1.name !== key2.name) {
    // Allow for minor variations like "feat." additions
    const name1Words = key1.name.split(" ")
    const name2Words = key2.name.split(" ")
    const commonWords = name1Words.filter((w) => name2Words.includes(w))

    // If less than 80% of words match, consider them different songs
    if (
      commonWords.length <
      Math.min(name1Words.length, name2Words.length) * 0.8
    ) {
      return false
    }
  }

  // Duration must be within 3 seconds (to account for different versions)
  const durationDiff = Math.abs(key1.duration - key2.duration)
  if (durationDiff > 3) return false

  return true
}

export function deduplicateSongs(
  songs: Array<SpotifyTrack & { playlistNames: string[] }>,
): ProcessedSong[] {
  const songMap = new Map<string, ProcessedSong>()

  songs.forEach((song) => {
    const key = createSongKey(song)
    const keyString = `${key.name}|${key.artists}|${key.album}|${key.duration}`

    // Check if we already have this exact song
    let found = false
    for (const [existingKeyString, existingSong] of songMap.entries()) {
      const existingKey = createSongKey(existingSong)

      if (areSongsSimilar(key, existingKey)) {
        // Merge playlist names
        song.playlistNames.forEach((playlist) => {
          if (!existingSong.playlistNames.includes(playlist)) {
            existingSong.playlistNames.push(playlist)
          }
        })
        found = true
        break
      }
    }

    if (!found) {
      songMap.set(keyString, { ...song })
    }
  })

  return Array.from(songMap.values())
}
