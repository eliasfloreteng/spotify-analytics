import type { Artist } from "@spotify/web-api-ts-sdk";
import type { TrackGroup } from "@/lib/song-deduplication";

/**
 * Genre data for a track group
 */
export interface TrackGroupWithGenres extends TrackGroup {
	genres: string[];
}

/**
 * Genre statistics over time
 */
export interface GenreTimelineData {
	month: string;
	date: Date;
	genres: Map<string, number>; // genre -> count
}

/**
 * Genre statistics
 */
export interface GenreStats {
	genre: string;
	trackCount: number;
	percentage: number;
	artistCount: number;
}

/**
 * Extract unique genres from artists
 */
export function extractGenresFromArtists(artists: Artist[]): string[] {
	const genreSet = new Set<string>();

	artists.forEach((artist) => {
		artist.genres.forEach((genre) => {
			genreSet.add(genre);
		});
	});

	return Array.from(genreSet);
}

/**
 * Map track groups to their genres based on artist information
 */
export function mapTrackGroupsToGenres(
	trackGroups: TrackGroup[],
	artistsMap: Map<string, Artist>,
): TrackGroupWithGenres[] {
	return trackGroups.map((group) => {
		const genreSet = new Set<string>();

		// Get all unique artist IDs from the group's representative track
		const artistIds = group.representativeTrack.artists.map((a) => a.id);

		// Collect genres from all artists
		artistIds.forEach((artistId) => {
			const artist = artistsMap.get(artistId);
			if (artist && artist.genres) {
				artist.genres.forEach((genre) => genreSet.add(genre));
			}
		});

		return {
			...group,
			genres: Array.from(genreSet),
		};
	});
}

/**
 * Calculate genre statistics from track groups
 */
export function calculateGenreStats(
	trackGroupsWithGenres: TrackGroupWithGenres[],
): GenreStats[] {
	const genreTrackCount = new Map<string, number>();
	const genreArtistSet = new Map<string, Set<string>>();

	trackGroupsWithGenres.forEach((group) => {
		group.genres.forEach((genre) => {
			// Count tracks
			genreTrackCount.set(genre, (genreTrackCount.get(genre) || 0) + 1);

			// Track unique artists per genre
			if (!genreArtistSet.has(genre)) {
				genreArtistSet.set(genre, new Set());
			}
			group.representativeTrack.artists.forEach((artist) => {
				genreArtistSet.get(genre)!.add(artist.id);
			});
		});
	});

	const totalTracks = trackGroupsWithGenres.length;

	// Convert to array and sort by track count
	const stats: GenreStats[] = Array.from(genreTrackCount.entries())
		.map(([genre, trackCount]) => ({
			genre,
			trackCount,
			percentage: (trackCount / totalTracks) * 100,
			artistCount: genreArtistSet.get(genre)?.size || 0,
		}))
		.sort((a, b) => b.trackCount - a.trackCount);

	return stats;
}

/**
 * Calculate genre distribution over time
 */
export function calculateGenreTimeline(
	trackGroupsWithGenres: TrackGroupWithGenres[],
): GenreTimelineData[] {
	const monthlyGenres = new Map<string, Map<string, number>>();

	// Aggregate genres by month
	trackGroupsWithGenres.forEach((group) => {
		group.tracks.forEach((track) => {
			const date = new Date(track.added_at);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

			if (!monthlyGenres.has(monthKey)) {
				monthlyGenres.set(monthKey, new Map());
			}

			const monthGenres = monthlyGenres.get(monthKey)!;

			group.genres.forEach((genre) => {
				monthGenres.set(genre, (monthGenres.get(genre) || 0) + 1);
			});
		});
	});

	// Convert to array and sort by date
	const timeline: GenreTimelineData[] = Array.from(monthlyGenres.entries())
		.map(([month, genres]) => ({
			month,
			date: new Date(month + "-01"),
			genres,
		}))
		.sort((a, b) => a.date.getTime() - b.date.getTime());

	return timeline;
}

/**
 * Get top N genres
 */
export function getTopGenres(
	stats: GenreStats[],
	n: number = 10,
): GenreStats[] {
	return stats.slice(0, n);
}

/**
 * Calculate genre diversity for a time period
 * Returns the number of unique genres in that period
 */
export function calculateGenreDiversity(
	trackGroupsWithGenres: TrackGroupWithGenres[],
	startDate: Date,
	endDate: Date,
): number {
	const genreSet = new Set<string>();

	trackGroupsWithGenres.forEach((group) => {
		group.tracks.forEach((track) => {
			const trackDate = new Date(track.added_at);
			if (trackDate >= startDate && trackDate <= endDate) {
				group.genres.forEach((genre) => genreSet.add(genre));
			}
		});
	});

	return genreSet.size;
}
