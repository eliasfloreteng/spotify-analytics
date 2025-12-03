# Spotify Analytics

A Next.js application that analyzes your Spotify library with detailed insights, featuring server-side authentication and comprehensive music analytics.

## Features

- 🎵 **Comprehensive Library Analysis**: Analyze liked songs, playlists, and tracks
- 🎨 **Genre Insights**: Track genre distribution and trends over time
- 📊 **Visual Analytics**: Interactive charts and heatmaps
- 🔄 **Smart Deduplication**: Automatically groups similar tracks
- 🔒 **Server-Side Auth**: Secure OAuth 2.0 authentication
- 📱 **Responsive Design**: Works on desktop and mobile

## Architecture

This application uses:
- **Next.js 16** with App Router
- **Server Actions** for data fetching
- **Server-side Spotify SDK** for API calls
- **Iron Session** for secure session management

## Prerequisites

- Node.js 18+ or Bun
- Spotify Developer Account

## Setup

### 1. Spotify Developer Account

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/callback`
4. Note your **Client ID** and **Client Secret**

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Session Secret (generate a random 32+ character string)
SESSION_SECRET=your_session_secret_at_least_32_characters_long
```

To generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install Dependencies

```bash
# Using bun (recommended)
bun install
```

### 4. Run Development Server

```bash
# Using bun
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Authentication Flow

1. User clicks "Sign in with Spotify"
2. Application redirects to `/api/auth/login`
3. Server generates auth URL and redirects to Spotify
4. User authorizes the application
5. Spotify redirects to `/api/auth/callback` with auth code
6. Server exchanges code for access/refresh tokens
7. Tokens stored in encrypted session cookie
8. User redirected back to homepage

### Data Fetching

1. User clicks "Fetch My Music"
2. Client calls `fetchAllSpotifyData()` server action
3. Server validates session and gets access token
4. Server fetches data from Spotify API:
   - User profile
   - Liked songs (paginated)
   - User playlists (paginated)
   - Tracks from each playlist (paginated)
   - Artist details with genres (batched)
5. Data returned to client for deduplication and analysis

### Rate Limiting

The application implements:
- **Concurrency Control**: Max 4 simultaneous requests to Spotify

## API Routes

- `GET /api/auth/callback` - Handles OAuth callback

## Deployment

### Environment Variables

Ensure all environment variables are set in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Railway/Render: Dashboard → Environment

### Session Secret

Generate a strong session secret for production:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set this as `SESSION_SECRET` in your deployment platform.

### Spotify Redirect URI

Update your Spotify app settings to include production callback URL:
- Development: `http://localhost:3000/api/auth/callback`
- Production: `https://yourdomain.com/api/auth/callback`

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Spotify API**: @spotify/web-api-ts-sdk
- **Session**: iron-session
- **Data Processing**: p-queue for concurrency control

## Privacy & Security

- **Server-side authentication**: Tokens stored in encrypted session cookies
- **No third-party tracking**: Your data stays on your device and server
- **Secure sessions**: Iron Session with strong encryption
- **HTTPS recommended**: Always use HTTPS in production

## License

MIT

## Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Recharts](https://recharts.org/)
- [shadcn/ui](https://ui.shadcn.com/)
