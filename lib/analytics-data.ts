import type { Artist, Track } from "@spotify/web-api-ts-sdk";
import {
	calculateGenreStats,
	calculateGenreTimeline,
	getTopGenres,
	mapTrackGroupsToGenres,
} from "./genre-analysis";
import type { TrackGroup } from "./song-deduplication";

export interface DashboardStats {
	uniqueSongs: number;
	totalTracks: number;
	duplicates: number;
	topArtists: Array<{ name: string; id: string; count: number }>;
	topAlbums: Array<{
		name: string;
		id: string;
		count: number;
		imageUrl?: string;
	}>;
	playlistCounts: number;
	avgTracksPerPlaylist: number;
	mostPlaylisted: Array<{ track: Track; count: number }>;
}

export interface ArtistStats {
	name: string;
	id: string;
	count: number;
	tracks: Track[];
	imageUrl?: string;
}

export interface AlbumStats {
	album: Track["album"];
	count: number;
	tracks: Track[];
}

export interface PlaylistSongStats {
	group: TrackGroup;
	track: Track;
	totalInstances: number;
	playlistCount: number;
	playlists: Array<{ id: string; name: string } | undefined>;
	isInLikedSongs: boolean;
}

export interface TimelineStats {
	timelineData: Array<{ month: string; count: number }>;
	yAxisMax: number;
	stats: {
		oldestDate: string | null;
		newestDate: string | null;
		totalMonths: number;
		avgPerMonth: number;
		peakMonth: string | null;
		peakCount: number;
	};
}

export interface DayData {
	date: Date;
	count: number;
	level: number;
}

export interface WeeklyActivityData {
	availableYears: number[];
	dailyDataByYear: Map<number, DayData[]>;
}

export interface GenreData {
	genreStats: ReturnType<typeof calculateGenreStats>;
	timelineData: Array<Record<string, any>>;
	topGenres: ReturnType<typeof getTopGenres>;
	overallStats: {
		totalGenres: number;
		topGenre: ReturnType<typeof getTopGenres>[0] | undefined;
		avgGenresPerTrack: string;
	};
}

export function calculateDashboardStats(
	trackGroups: TrackGroup[],
	artists: Map<string, Artist>,
): DashboardStats {
	const uniqueSongs = trackGroups.length;
	const totalTracks = trackGroups.reduce(
		(sum, group) => sum + group.tracks.length,
		0,
	);
	const duplicates = totalTracks - uniqueSongs;

	// Top artists with IDs
	const artistCounts = new Map<
		string,
		{ name: string; id: string; count: number }
	>();
	trackGroups.forEach((group) => {
		group.representativeTrack.artists.forEach((artist) => {
			const existing = artistCounts.get(artist.id);
			if (existing) {
				existing.count++;
			} else {
				artistCounts.set(artist.id, {
					name: artist.name,
					id: artist.id,
					count: 1,
				});
			}
		});
	});
	const topArtists = Array.from(artistCounts.values())
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	// Top albums with images and IDs
	const albumCounts = new Map<
		string,
		{ name: string; id: string; count: number; imageUrl?: string }
	>();
	trackGroups.forEach((group) => {
		const album = group.representativeTrack.album;
		const key = `${album.id}-${album.name}`;
		const existing = albumCounts.get(key);
		if (existing) {
			existing.count++;
		} else {
			albumCounts.set(key, {
				name: album.name,
				id: album.id,
				count: 1,
				imageUrl: album.images?.[0]?.url,
			});
		}
	});
	const topAlbums = Array.from(albumCounts.values())
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	// Most playlisted songs
	const playlistCounts = trackGroups
		.map((group) => {
			const playlistInstances = group.tracks.filter(
				(t) => t.source === "playlist",
			);
			const uniquePlaylists = new Set(
				playlistInstances.map((t) => t.playlist.id),
			);
			return {
				track: group.representativeTrack,
				count: uniquePlaylists.size,
			};
		})
		.filter((item) => item.count > 0)
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	// Calculate average tracks per playlist
	const playlistTrackCounts = new Map<string, number>();
	trackGroups.forEach((group) => {
		group.tracks.forEach((track) => {
			if (track.source === "playlist") {
				const id = track.playlist.id;
				playlistTrackCounts.set(id, (playlistTrackCounts.get(id) || 0) + 1);
			}
		});
	});
	const avgTracksPerPlaylist =
		playlistTrackCounts.size > 0
			? Math.round(
					Array.from(playlistTrackCounts.values()).reduce(
						(sum, count) => sum + count,
						0,
					) / playlistTrackCounts.size,
				)
			: 0;

	return {
		uniqueSongs,
		totalTracks,
		duplicates,
		topArtists,
		topAlbums,
		playlistCounts: playlistTrackCounts.size,
		avgTracksPerPlaylist,
		mostPlaylisted: playlistCounts,
	};
}

export function calculateArtistStats(
	trackGroups: TrackGroup[],
	artists: Map<string, Artist>,
): ArtistStats[] {
	const stats = new Map<
		string,
		{ name: string; id: string; count: number; tracks: Track[] }
	>();

	// Use only the representative track from each group (deduplicated)
	trackGroups.forEach((group) => {
		const track = group.representativeTrack;
		track.artists.forEach((artist) => {
			const existing = stats.get(artist.id);
			if (existing) {
				existing.count++;
				existing.tracks.push(track);
			} else {
				stats.set(artist.id, {
					name: artist.name,
					id: artist.id,
					count: 1,
					tracks: [track],
				});
			}
		});
	});

	const artistStats = Array.from(stats.values()).sort(
		(a, b) => b.count - a.count,
	);

	// Add images for top 50 artists
	return artistStats.map((artist) => ({
		...artist,
		imageUrl: artists.get(artist.id)?.images?.[0]?.url,
	}));
}

export function calculateAlbumStats(trackGroups: TrackGroup[]): AlbumStats[] {
	const stats = new Map<
		string,
		{ album: Track["album"]; count: number; tracks: Track[] }
	>();

	// Use only the representative track from each group (deduplicated)
	trackGroups.forEach((group) => {
		const track = group.representativeTrack;
		const key = `${track.album.id}-${track.album.name}`;
		const existing = stats.get(key);

		if (existing) {
			existing.count++;
			existing.tracks.push(track);
		} else {
			stats.set(key, {
				album: track.album,
				count: 1,
				tracks: [track],
			});
		}
	});

	return Array.from(stats.values()).sort((a, b) => b.count - a.count);
}

export function calculatePlaylistStats(
	trackGroups: TrackGroup[],
): PlaylistSongStats[] {
	// Count how many times each song appears across different sources
	const stats = trackGroups
		.map((group) => {
			// Count instances in playlists (not liked songs)
			const playlistInstances = group.tracks.filter(
				(t) => t.source === "playlist",
			);
			const uniquePlaylists = new Set(
				playlistInstances.map((t) => t.playlist.id),
			);

			return {
				group,
				track: group.representativeTrack,
				totalInstances: group.tracks.length,
				playlistCount: uniquePlaylists.size,
				playlists: Array.from(uniquePlaylists)
					.map((id) => {
						const instance = playlistInstances.find(
							(t) => t.playlist.id === id,
						);
						return instance?.playlist;
					})
					.filter(Boolean),
				isInLikedSongs: group.tracks.some((t) => t.source === "liked"),
			};
		})
		.filter((item) => item.playlistCount > 0) // Only show songs that are in at least one playlist
		.sort((a, b) => b.playlistCount - a.playlistCount);

	return stats;
}

export function calculateTimelineStats(
	trackGroups: TrackGroup[],
): TimelineStats {
	const monthCounts = new Map<string, number>();

	// Use all tracks (not deduplicated) to show when songs were added
	trackGroups.forEach((group) => {
		group.tracks.forEach((track) => {
			const date = new Date(track.added_at);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
			monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
		});
	});

	// Convert to array and sort by date
	const data = Array.from(monthCounts.entries())
		.map(([month, count]) => ({
			month,
			count,
			date: new Date(`${month}-01`),
		}))
		.sort((a, b) => a.date.getTime() - b.date.getTime());

	// Calculate median for Y-axis max
	const counts = data.map((d) => d.count).sort((a, b) => a - b);
	const median =
		counts.length === 0
			? 0
			: counts.length % 2 === 0
				? (counts[counts.length / 2 - 1] + counts[counts.length / 2]) / 2
				: counts[Math.floor(counts.length / 2)];

	const yAxisMax = median * 3.5;

	// Format data
	const timelineData = data.map(({ month, count }) => ({
		month: new Date(`${month}-01`).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
		}),
		count,
	}));

	// Calculate stats
	const allDates = trackGroups.flatMap((group) =>
		group.tracks.map((track) => new Date(track.added_at)),
	);

	let stats: TimelineStats["stats"];

	if (allDates.length === 0) {
		stats = {
			oldestDate: null,
			newestDate: null,
			totalMonths: 0,
			avgPerMonth: 0,
			peakMonth: null,
			peakCount: 0,
		};
	} else {
		const oldest = new Date(Math.min(...allDates.map((d) => d.getTime())));
		const newest = new Date(Math.max(...allDates.map((d) => d.getTime())));

		const monthsDiff =
			(newest.getFullYear() - oldest.getFullYear()) * 12 +
			(newest.getMonth() - oldest.getMonth()) +
			1;

		const avgPerMonth = Math.round(trackGroups.length / monthsDiff);

		// Find peak month
		const peakMonthCounts = new Map<string, number>();
		trackGroups.forEach((group) => {
			group.tracks.forEach((track) => {
				const date = new Date(track.added_at);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
				peakMonthCounts.set(monthKey, (peakMonthCounts.get(monthKey) || 0) + 1);
			});
		});

		let peakMonth = "";
		let peakCount = 0;
		peakMonthCounts.forEach((count, month) => {
			if (count > peakCount) {
				peakCount = count;
				peakMonth = month;
			}
		});

		const peakDate = peakMonth
			? new Date(`${peakMonth}-01`).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
				})
			: null;

		stats = {
			oldestDate: oldest.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
			}),
			newestDate: newest.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
			}),
			totalMonths: monthsDiff,
			avgPerMonth,
			peakMonth: peakDate,
			peakCount,
		};
	}

	return { timelineData, yAxisMax, stats };
}

export function calculateWeeklyActivityData(
	trackGroups: TrackGroup[],
): WeeklyActivityData {
	const dayCounts = new Map<string, number>();

	// Count tracks per day
	trackGroups.forEach((group) => {
		group.tracks.forEach((track) => {
			const date = new Date(track.added_at);
			const dayKey = date.toISOString().split("T")[0];
			dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
		});
	});

	// Find date range
	const allDates = trackGroups.flatMap((group) =>
		group.tracks.map((track) => new Date(track.added_at)),
	);

	if (allDates.length === 0) {
		return {
			availableYears: [],
			dailyDataByYear: new Map<number, DayData[]>(),
		};
	}

	const oldestDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
	const newestDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

	// Get all years in range
	const years: number[] = [];
	for (
		let year = oldestDate.getFullYear();
		year <= newestDate.getFullYear();
		year++
	) {
		years.push(year);
	}

	// Generate daily data for each year with per-year color scaling
	const dataByYear = new Map<number, DayData[]>();

	years.forEach((year) => {
		const yearStart = new Date(year, 0, 1);
		const yearEnd = new Date(year, 11, 31);
		const days: DayData[] = [];

		const currentDate = new Date(yearStart);
		while (currentDate <= yearEnd) {
			const dayKey = currentDate.toISOString().split("T")[0];
			const count = dayCounts.get(dayKey) || 0;

			days.push({
				date: new Date(currentDate),
				count,
				level: 0, // Will be calculated after we have all days for this year
			});

			currentDate.setDate(currentDate.getDate() + 1);
		}

		// Calculate levels for this year using 90th percentile to handle outliers
		const yearCounts = days.map((d) => d.count).filter((c) => c > 0);

		if (yearCounts.length > 0) {
			yearCounts.sort((a, b) => a - b);
			const percentile90Index = Math.floor(yearCounts.length * 0.9);
			const max =
				yearCounts[percentile90Index] || yearCounts[yearCounts.length - 1];

			// Assign levels based on this year's 90th percentile
			days.forEach((day: DayData) => {
				if (day.count === 0) {
					day.level = 0;
				} else if (day.count <= max * 0.25) {
					day.level = 1;
				} else if (day.count <= max * 0.5) {
					day.level = 2;
				} else if (day.count <= max * 0.75) {
					day.level = 3;
				} else {
					day.level = 4;
				}
			});
		}

		dataByYear.set(year, days);
	});

	return {
		availableYears: years.sort((a, b) => b - a),
		dailyDataByYear: dataByYear,
	};
}

export function calculateGenreData(
	trackGroups: TrackGroup[],
	artists: Map<string, Artist>,
): GenreData {
	// Map track groups to genres
	const trackGroupsWithGenres = mapTrackGroupsToGenres(trackGroups, artists);

	// Calculate statistics
	const genreStats = calculateGenreStats(trackGroupsWithGenres);
	const timeline = calculateGenreTimeline(trackGroupsWithGenres);
	const topGenres = getTopGenres(genreStats, 10);

	// Group timeline data by quarters
	const quarterlyData = new Map<string, Map<string, number>>();

	timeline.forEach((item) => {
		const date = new Date(`${item.month}-01`);
		const year = date.getFullYear();
		const month = date.getMonth();
		const quarter = Math.floor(month / 3) + 1;
		const quarterKey = `Q${quarter} ${year}`;

		if (!quarterlyData.has(quarterKey)) {
			quarterlyData.set(quarterKey, new Map());
		}

		const quarterGenres = quarterlyData.get(quarterKey)!;

		// Aggregate genre counts for this quarter
		item.genres.forEach((count, genre) => {
			quarterGenres.set(genre, (quarterGenres.get(genre) || 0) + count);
		});
	});

	// Format timeline data for chart with relative percentages
	const timelineData = Array.from(quarterlyData.entries()).map(
		([quarter, genres]) => {
			const dataPoint: any = {
				month: quarter,
			};

			// Calculate total for this quarter
			let quarterTotal = 0;
			topGenres.forEach((genre) => {
				quarterTotal += genres.get(genre.genre) || 0;
			});

			// Add top genres as percentages and store actual values
			topGenres.forEach((genre) => {
				const actualValue = genres.get(genre.genre) || 0;
				const percentage =
					quarterTotal > 0 ? (actualValue / quarterTotal) * 100 : 0;
				dataPoint[genre.genre] = percentage;
				dataPoint[`${genre.genre}_actual`] = actualValue;
			});

			return dataPoint;
		},
	);

	// Calculate overall stats
	const totalGenres = genreStats.length;
	const topGenre = genreStats[0];
	const totalTracks = trackGroups.length;

	// Calculate average genres per track
	const totalGenreAssignments = trackGroupsWithGenres.reduce(
		(sum, group) => sum + group.genres.length,
		0,
	);
	const avgGenresPerTrack = totalGenreAssignments / totalTracks;

	const overallStats = {
		totalGenres,
		topGenre,
		avgGenresPerTrack: avgGenresPerTrack.toFixed(1),
	};

	return {
		genreStats,
		timelineData,
		topGenres,
		overallStats,
	};
}
