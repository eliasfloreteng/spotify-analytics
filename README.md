# Spotify Analytics

A Next.js application that analyzes your Spotify library, showing insights about your music taste including top artists, albums, most playlisted songs, and timeline visualizations.

## Features

- 🎵 Analyze your entire Spotify library (liked songs + playlists)
- 📊 View top artists and albums
- 🎼 See your most playlisted songs
- 📅 Timeline heatmap of when you added songs
- 🔐 Secure OAuth 2.0 authentication with PKCE
- 💾 Local caching for faster subsequent loads
- 🎨 Beautiful UI with shadcn/ui components

## Setup

### 1. Create a Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the details:
   - **App name**: Spotify Analytics (or any name you prefer)
   - **App description**: Personal Spotify library analytics
   - **Redirect URI**: `http://localhost:3000/callback`
   - **API/SDKs**: Web API
5. Save your app
6. Copy your **Client ID** from the app settings

### 2. Configure Environment Variables

1. Copy the `.env.local` file and update it with your Spotify Client ID:

```bash
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/callback
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Run the Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "Connect with Spotify" on the login page
2. Authorize the app to access your Spotify data
3. Wait for the app to fetch your library (this may take a few minutes for large libraries)
4. Explore your music analytics across different tabs

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Spotify API**: @spotify/web-api-ts-sdk
- **Authentication**: OAuth 2.0 with PKCE (client-side only)

## Architecture

- **Client-side authentication**: Uses PKCE flow for secure authentication without server-side sessions
- **Server components**: Used where possible for better performance
- **Local storage**: Caches fetched data to avoid re-fetching on every page load
- **Deduplication**: Smart song deduplication across playlists

## Privacy

- All authentication tokens are stored locally in your browser
- No data is sent to any third-party servers
- Your Spotify data stays on your device

## License

MIT
