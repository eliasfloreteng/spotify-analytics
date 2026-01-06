# Spotify Archive & Insights Platform

> Spotify vault and analytics dashboard.

## Authentication

1. Users authenticate with Spotify OAuth
2. A stateless session to the service is granted that never expires
3. Spotify tokens are refreshed automatically

## Data ingestion

### Assumptions

- Users can have upwards of 10000 songs
- The server restarts are infrequent
- Unique user count is low
- The structure of the Spotify data never/rarely changes

### Requirements

- All data from the Spotify API should be saved, mainly:
  - Saved tracks
  - Playlists
  - Playlist tracks
  - Albums for all above tracks
  - Artists for all above tracks
  - Recently played tracks
- Always incremental updates (except first run), utilizing ordering, snapshot IDs and timestamps
- Respecting Spotify rate limits
- Gracefully recovering from errors
- Progress updates are sent to the client without polling
- Initial fetch to get metadata and total items to fetch

## Data processing

The tracks from Spotify may contain duplicates, meaning tracks that are the same song (having the same or very similar sound file) but appear in different albums and therefore have different IDs. Relations for which tracks are grouped as the same song should be stored.

### Deduplication algorithm

Criterion 1 (Strict):
- Duration within 2 seconds
- Same song name (case insensitive)
- Same artist set (case insensitive, order independent)

Criterion 2 (Fuzzy):
- Duration within 50ms
- Song name (normalized) is a subset of the other (min 3 chars for smaller)
- Artist set (normalized) is a subset of the other (can be equal)

#### Normalization of song and artist names

Turn all into lowercase, remove symbols, keep international letters (for example åäö)

## Library insights/statistics

For all statistics, only tracks from playlists created by the user should be considered. The deduplicated, grouped tracks should be used, picking a representative track from the group (the one appearing in most playlists). The statistics should also be cached on the client.

### Visualizations

- Artists with most songs in library
- Albums with most songs in library
- Songs that appear in the most playlists
- Top genres (based on artists)
- Genre distribution over time (stacked bar chart by quarter)
- Timeline with number of added songs, similar to the GitHub commit graph
- List of recently played songs (with time it was played, relative to now if <24 hours ago)
- List of songs that are in a playlist but not in liked songs

### Numbers

- Number of unique songs, compared to total
- Number of playlists and average tracks per playlist
- Genre diversity
- Average songs added per month
