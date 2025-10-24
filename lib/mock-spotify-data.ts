export interface SpotifyTrack {
  added_at: string
  track: {
    id: string
    name: string
    duration_ms: number
    explicit: boolean
    artists: Array<{
      id: string
      name: string
      href: string
    }>
    album: {
      id: string
      name: string
      album_type: string
      total_tracks: number
      release_date: string
      images: Array<{
        url: string
        height: number
        width: number
      }>
      artists: Array<{
        id: string
        name: string
      }>
    }
    track_number: number
    uri: string
  }
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  tracks: {
    href: string
    total: number
  }
}

export interface MockData {
  likedSongs: SpotifyTrack[]
  playlists: Array<{
    playlist: SpotifyPlaylist
    tracks: SpotifyTrack[]
  }>
}

const artistNames = [
  "The Midnight",
  "ODESZA",
  "Porter Robinson",
  "Madeon",
  "Daft Punk",
  "Justice",
  "Kavinsky",
  "M83",
  "Tycho",
  "Boards of Canada",
  "Aphex Twin",
  "Burial",
  "Jon Hopkins",
  "Four Tet",
  "Caribou",
  "Flume",
  "Disclosure",
  "Kaytranada",
  "Anderson .Paak",
  "Mac Miller",
  "Frank Ocean",
  "Tyler, The Creator",
  "Kendrick Lamar",
  "Childish Gambino",
  "The Weeknd",
  "Tame Impala",
  "Arctic Monkeys",
  "The Strokes",
  "Phoenix",
  "Two Door Cinema Club",
]

const albumPrefixes = [
  "Nocturnal",
  "Endless",
  "Midnight",
  "Electric",
  "Neon",
  "Cosmic",
  "Digital",
  "Synthetic",
  "Future",
  "Retro",
]

const albumSuffixes = [
  "Dreams",
  "Nights",
  "Waves",
  "Lights",
  "Sounds",
  "Vibes",
  "Memories",
  "Journey",
  "Paradise",
  "Horizon",
]

const trackPrefixes = [
  "Lost in",
  "Dancing with",
  "Chasing",
  "Dreaming of",
  "Running through",
  "Falling into",
  "Waiting for",
  "Searching for",
  "Living in",
  "Fading into",
]

const trackSuffixes = [
  "the Night",
  "Yesterday",
  "Tomorrow",
  "the Stars",
  "the City",
  "the Moment",
  "Forever",
  "the Light",
  "the Dark",
  "Eternity",
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateTrackName(): string {
  if (Math.random() > 0.3) {
    return `${randomItem(trackPrefixes)} ${randomItem(trackSuffixes)}`
  }
  return randomItem(trackSuffixes)
}

function generateAlbumName(): string {
  return `${randomItem(albumPrefixes)} ${randomItem(albumSuffixes)}`
}

function generateRandomDate(start: Date, end: Date): string {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  )
  return date.toISOString()
}

function generateTrack(
  artistName: string,
  albumName: string,
  albumId: string,
): SpotifyTrack {
  const trackId = `track_${Math.random().toString(36).substr(2, 9)}`
  const artistId = `artist_${Math.random().toString(36).substr(2, 9)}`

  // Add some variation - sometimes add a second artist
  const artists = [
    {
      id: artistId,
      name: artistName,
      href: `https://api.spotify.com/v1/artists/${artistId}`,
    },
  ]
  if (Math.random() > 0.7) {
    const secondArtist = randomItem(artistNames.filter((a) => a !== artistName))
    artists.push({
      id: `artist_${Math.random().toString(36).substr(2, 9)}`,
      name: secondArtist,
      href: `https://api.spotify.com/v1/artists/${artistId}`,
    })
  }

  return {
    added_at: generateRandomDate(new Date(2018, 0, 1), new Date()),
    track: {
      id: trackId,
      name: generateTrackName(),
      duration_ms: Math.floor(Math.random() * 240000) + 120000, // 2-6 minutes
      explicit: Math.random() > 0.8,
      artists,
      album: {
        id: albumId,
        name: albumName,
        album_type: Math.random() > 0.7 ? "single" : "album",
        total_tracks: Math.floor(Math.random() * 15) + 5,
        release_date: new Date(
          2015 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          1,
        )
          .toISOString()
          .split("T")[0],
        images: [
          {
            url: `/placeholder.svg?height=640&width=640`,
            height: 640,
            width: 640,
          },
        ],
        artists: [{ id: artistId, name: artistName }],
      },
      track_number: Math.floor(Math.random() * 15) + 1,
      uri: `spotify:track:${trackId}`,
    },
  }
}

export function generateMockData(): MockData {
  const likedSongs: SpotifyTrack[] = []
  const playlists: Array<{
    playlist: SpotifyPlaylist
    tracks: SpotifyTrack[]
  }> = []

  // Generate liked songs (around 10000)
  const targetLikedSongs = 10000
  const artistAlbums = new Map<string, string[]>()

  // Pre-generate albums for each artist
  artistNames.forEach((artist) => {
    const albumCount = Math.floor(Math.random() * 5) + 3
    const albums = Array.from({ length: albumCount }, () => generateAlbumName())
    artistAlbums.set(artist, albums)
  })

  for (let i = 0; i < targetLikedSongs; i++) {
    const artist = randomItem(artistNames)
    const albums = artistAlbums.get(artist)!
    const album = randomItem(albums)
    const albumId = `album_${artist}_${album}`.replace(/\s/g, "_")

    likedSongs.push(generateTrack(artist, album, albumId))
  }

  // Generate playlists (20-30 playlists)
  const playlistCount = Math.floor(Math.random() * 10) + 20
  const playlistNames = [
    "Chill Vibes",
    "Workout Mix",
    "Road Trip",
    "Late Night",
    "Focus Flow",
    "Party Hits",
    "Indie Favorites",
    "Electronic Dreams",
    "Hip Hop Essentials",
    "Rock Classics",
    "Summer Playlist",
    "Winter Warmth",
    "Morning Coffee",
    "Evening Wind Down",
    "Discover Weekly Archive",
    "Throwback Thursday",
    "New Music Friday",
    "Rainy Day",
    "Feel Good",
    "Deep Focus",
    "Study Session",
    "Gaming Soundtrack",
    "Cooking Tunes",
    "Shower Songs",
    "Car Karaoke",
    "Gym Motivation",
    "Relaxation",
    "Upbeat Energy",
    "Melancholic Moods",
    "Nostalgic Nights",
  ]

  for (let i = 0; i < playlistCount; i++) {
    const playlistId = `playlist_${Math.random().toString(36).substr(2, 9)}`
    const playlistName = playlistNames[i] || `Playlist ${i + 1}`

    // Each playlist has 50-300 songs
    const trackCount = Math.floor(Math.random() * 250) + 50
    const playlistTracks: SpotifyTrack[] = []

    // Mix of liked songs and unique songs
    for (let j = 0; j < trackCount; j++) {
      if (Math.random() > 0.3 && likedSongs.length > 0) {
        // 70% chance to use a liked song
        playlistTracks.push(randomItem(likedSongs))
      } else {
        // 30% chance to generate a new song
        const artist = randomItem(artistNames)
        const albums = artistAlbums.get(artist)!
        const album = randomItem(albums)
        const albumId = `album_${artist}_${album}`.replace(/\s/g, "_")
        playlistTracks.push(generateTrack(artist, album, albumId))
      }
    }

    playlists.push({
      playlist: {
        id: playlistId,
        name: playlistName,
        description: `A curated playlist of ${trackCount} tracks`,
        tracks: {
          href: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          total: trackCount,
        },
      },
      tracks: playlistTracks,
    })
  }

  return { likedSongs, playlists }
}

export async function fetchAllSongs(
  mockData: MockData,
  onProgress: (current: number, total: number) => void,
): Promise<Array<SpotifyTrack & { playlistNames: string[] }>> {
  const allSongs: Array<SpotifyTrack & { playlistNames: string[] }> = []

  // Calculate total items to fetch
  const totalLikedPages = Math.ceil(mockData.likedSongs.length / 50)
  const totalPlaylistPages = mockData.playlists.reduce(
    (sum, p) => sum + Math.ceil(p.tracks.length / 50),
    0,
  )
  const totalPages = totalLikedPages + totalPlaylistPages

  let currentPage = 0

  // Simulate fetching liked songs in batches of 50
  for (let i = 0; i < mockData.likedSongs.length; i += 50) {
    await new Promise((resolve) => setTimeout(resolve, 50)) // Simulate API delay
    const batch = mockData.likedSongs.slice(i, i + 50)
    batch.forEach((song) => {
      allSongs.push({ ...song, playlistNames: ["Liked Songs"] })
    })
    currentPage++
    onProgress(currentPage, totalPages)
  }

  // Simulate fetching playlist songs in batches of 50
  for (const { playlist, tracks } of mockData.playlists) {
    for (let i = 0; i < tracks.length; i += 50) {
      await new Promise((resolve) => setTimeout(resolve, 50)) // Simulate API delay
      const batch = tracks.slice(i, i + 50)
      batch.forEach((song) => {
        allSongs.push({ ...song, playlistNames: [playlist.name] })
      })
      currentPage++
      onProgress(currentPage, totalPages)
    }
  }

  return allSongs
}
