# Spotify Analytics

A Next.js application that analyzes your Spotify library with detailed insights, featuring server-side authentication, Redis caching, and comprehensive music analytics.

## Features

- 🎵 **Comprehensive Library Analysis**: Analyze liked songs, playlists, and tracks
- 🎨 **Genre Insights**: Track genre distribution and trends over time
- 📊 **Visual Analytics**: Interactive charts and heatmaps
- 🔄 **Smart Deduplication**: Automatically groups similar tracks
- 💾 **Redis Caching**: Fast data retrieval with intelligent caching
- 🔒 **Server-Side Auth**: Secure OAuth 2.0 authentication
- 📱 **Responsive Design**: Works on desktop and mobile

## Architecture

This application uses:
- **Next.js 16** with App Router
- **Server Actions** for data fetching
- **Server-side Spotify SDK** for API calls
- **Redis** for caching individual tracks, artists, and albums
- **Iron Session** for secure session management
- **IndexedDB** for client-side data persistence

## Prerequisites

- Node.js 18+ or Bun
- Redis server (local or remote)
- Spotify Developer Account

## Setup

### 1. Spotify Developer Account

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/callback`
4. Note your **Client ID** and **Client Secret**

### 2. Redis Setup

#### Local Redis (recommended for development)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:latest
```

#### Cloud Redis

Use services like:
- [Upstash](https://upstash.com/) (Free tier available)
- [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)

### 3. Environment Variables

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

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

To generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Install Dependencies

```bash
# Using bun (recommended)
bun install

# Or using npm
npm install

# Or using yarn
yarn install
```

### 5. Run Development Server

```bash
# Using bun
bun dev

# Or using npm
npm run dev
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
5. Each item is cached in Redis with appropriate TTL:
   - Tracks: 7 days
   - Artists: 7 days
   - Albums: 7 days
   - User data: 1 hour
6. Data returned to client for deduplication and analysis
7. Results cached in IndexedDB for offline access

### Caching Strategy

#### Redis (Server-Side)
- **Purpose**: Cache individual Spotify API responses
- **Keys**: `spotify:track:{id}`, `spotify:artist:{id}`, `spotify:album:{id}`
- **TTL**: 7 days for tracks/artists/albums, 1 hour for user data
- **Benefits**: Reduces API calls, faster subsequent fetches

#### IndexedDB (Client-Side)
- **Purpose**: Persist entire analytics results
- **Data**: All tracks, artists, deduplication groups
- **Benefits**: Instant load on return visits, offline access

### Rate Limiting

The application implements:
- **Concurrency Control**: Max 3 simultaneous requests to Spotify
- **Retry Logic**: Exponential backoff with max 5 retries
- **Rate Limit Handling**: Respects `Retry-After` headers

## API Routes

- `GET /api/auth/login` - Initiates Spotify OAuth flow
- `GET /api/auth/callback` - Handles OAuth callback
- `POST /api/auth/logout` - Clears session and logs out

## Server Actions

Located in `lib/actions/spotify-actions.ts`:

- `checkAuthentication()` - Check if user is authenticated
- `fetchUserProfile()` - Get current user profile
- `fetchTrack(trackId)` - Get single track (with Redis cache)
- `fetchArtist(artistId)` - Get single artist (with Redis cache)
- `fetchArtists(artistIds[])` - Get multiple artists (batched, with Redis cache)
- `fetchAlbum(albumId)` - Get single album (with Redis cache)
- `fetchAllSpotifyData()` - Fetch all user data with concurrency control
- `logout()` - Clear session

## Project Structure

```
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts       # OAuth initiation
│   │       ├── callback/route.ts    # OAuth callback
│   │       └── logout/route.ts      # Logout endpoint
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Homepage
├── components/
│   ├── spotify-analytics.tsx        # Main analytics component
│   ├── dashboard.tsx                # Overview dashboard
│   ├── top-artists.tsx              # Artist frequency chart
│   ├── top-albums.tsx               # Album frequency chart
│   ├── genres-over-time.tsx         # Genre analysis
│   └── ...                          # Other components
├── contexts/
│   └── spotify-context.tsx          # React context for Spotify state
├── lib/
│   ├── actions/
│   │   └── spotify-actions.ts       # Server actions
│   ├── redis.ts                     # Redis client and utilities
│   ├── session.ts                   # Session management
│   ├── spotify-server.ts            # Server-side Spotify SDK
│   ├── song-deduplication.ts        # Track deduplication logic
│   └── indexed-db-persistence.ts    # IndexedDB caching
└── .env.example                     # Environment variables template
```

## Deployment

### Environment Variables

Ensure all environment variables are set in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Railway/Render: Dashboard → Environment

### Redis in Production

For production, use a managed Redis service:
- **Upstash**: Built for serverless, generous free tier
- **Redis Cloud**: Managed by Redis Labs
- **AWS ElastiCache**: For AWS deployments

Update `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` accordingly.

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

## Performance Optimizations

- **Concurrency Control**: Limits simultaneous API requests
- **Batch Fetching**: Artists fetched in batches of 50
- **Redis Caching**: Reduces redundant API calls
- **IndexedDB Persistence**: Instant load times for cached data
- **Server Actions**: Reduced client bundle size
- **Progressive Loading**: UI updates as data loads

## Troubleshooting

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# View Redis logs
# macOS with brew
brew services list

# Linux
sudo systemctl status redis
```

### Session Issues

If authentication isn't working:
1. Clear browser cookies
2. Verify `SESSION_SECRET` is at least 32 characters
3. Check `SPOTIFY_REDIRECT_URI` matches exactly in Spotify dashboard

### Rate Limiting

If you hit Spotify rate limits:
- Reduce concurrency in `lib/actions/spotify-actions.ts` (currently 3)
- Increase Redis cache TTL for frequently accessed data
- The app automatically retries with exponential backoff

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Spotify API**: @spotify/web-api-ts-sdk
- **Caching**: Redis (ioredis)
- **Session**: iron-session
- **Data Processing**: p-queue for concurrency control

## Privacy & Security

- **Server-side authentication**: Tokens stored in encrypted session cookies
- **Redis caching**: API responses cached server-side for performance
- **No third-party tracking**: Your data stays on your device and server
- **Secure sessions**: Iron Session with strong encryption
- **HTTPS recommended**: Always use HTTPS in production

## License

MIT

## Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Redis](https://redis.io/)
- [Recharts](https://recharts.org/)
- [shadcn/ui](https://ui.shadcn.com/)
