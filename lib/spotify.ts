import { SpotifyApi } from "@spotify/web-api-ts-sdk"

if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
  throw new Error("Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable")
}

export const spotify = SpotifyApi.withUserAuthorization(
  process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
  process.env.NEXT_PUBLIC_REDIRECT_URI || "http://127.0.01:3000/callback",
  [
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-private",
    "user-read-email",
  ],
)
