import Login from "@/components/login";
import SpotifyAnalytics from "@/components/spotify-analytics";
import {
	calculateAlbumStats,
	calculateArtistStats,
	calculateDashboardStats,
	calculateGenreData,
	calculatePlaylistStats,
	calculateTimelineStats,
	calculateWeeklyActivityData,
} from "@/lib/analytics-data";
import {
	type CombinedTrack,
	groupSimilarTracks,
} from "@/lib/song-deduplication";
import { getSpotifyClient } from "@/lib/spotify";
import { fetchSpotifyData } from "@/lib/spotify-fetching";
import { getSpotifyDataFromDb } from "@/lib/spotify-queries";

export default async function HomePage() {
	const spotify = await getSpotifyClient();
	if (!spotify) {
		return <Login />;
	}

	// Fetch user profile to get user ID
	const userProfile = await spotify.currentUser.profile();

	// Try to get data from database first
	let data: Awaited<ReturnType<typeof getSpotifyDataFromDb>>;
	try {
		data = await getSpotifyDataFromDb(userProfile.id);
	} catch {
		// If data doesn't exist in DB, fetch from Spotify API and populate DB
		console.log("Data not in database, fetching from Spotify API...");
		await fetchSpotifyData(spotify, (completed, total) => {
			const progress = (completed / total) * 100;
			console.log(
				`Progress: ${completed}/${total} requests completed ${progress.toFixed(2)}%`,
			);
		});
		// Now get the data from DB
		data = await getSpotifyDataFromDb(userProfile.id);
	}

	const { user, savedTracks, playlistsWithTracks, artists } = data;
	const userPlaylists = playlistsWithTracks.filter(
		(playlist) =>
			playlist.playlist.owner.id === user.id || playlist.playlist.collaborative,
	);

	const playlistSongs = userPlaylists.flatMap((playlist) =>
		playlist.tracks.map((track) => ({
			source: "playlist" as const,
			playlist: playlist.playlist,
			...track,
		})),
	);

	const combinedTracks = [
		...savedTracks.map((track) => ({
			source: "liked" as const,
			...track,
		})),
		...playlistSongs,
	] satisfies CombinedTrack[];

	const groups = groupSimilarTracks(combinedTracks);

	// Create artist map
	const artistMap = new Map(artists.map((artist) => [artist.id, artist]));

	// Pre-compute all data transformations
	const dashboardStats = calculateDashboardStats(groups, artistMap);
	const artistStats = calculateArtistStats(groups, artistMap);
	const albumStats = calculateAlbumStats(groups);
	const playlistStats = calculatePlaylistStats(groups);
	const timelineStats = calculateTimelineStats(groups);
	const weeklyActivityData = calculateWeeklyActivityData(groups);
	const genreData = calculateGenreData(groups, artistMap);

	return (
		<SpotifyAnalytics
			user={user}
			groups={groups}
			combinedTracks={combinedTracks}
			dashboardStats={dashboardStats}
			artistStats={artistStats}
			albumStats={albumStats}
			playlistStats={playlistStats}
			timelineStats={timelineStats}
			weeklyActivityData={weeklyActivityData}
			genreData={genreData}
		/>
	);
}
