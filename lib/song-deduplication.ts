import { Track } from "@spotify/web-api-ts-sdk"
import { CombinedTrack } from "./spotify-data-fetcher"

/**
 * Result type for grouped tracks
 */
export interface TrackGroup {
  tracks: CombinedTrack[]
  representativeTrack: Track
  matchReasons: {
    hasStrictMatches: boolean
    hasFuzzyMatches: boolean
    isSingleTrack: boolean
  }
}

/**
 * Union-Find (Disjoint Set Union) data structure for efficient grouping
 */
class UnionFind {
  private parent: number[]
  private rank: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i)
    this.rank = Array(size).fill(0)
  }

  /**
   * Find the root of the set containing x (with path compression)
   */
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]) // Path compression
    }
    return this.parent[x]
  }

  /**
   * Union two sets containing x and y (by rank)
   */
  union(x: number, y: number): void {
    const rootX = this.find(x)
    const rootY = this.find(y)

    if (rootX === rootY) return

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX
    } else {
      this.parent[rootY] = rootX
      this.rank[rootX]++
    }
  }

  /**
   * Get all groups as arrays of indices
   */
  getGroups(): number[][] {
    const groups = new Map<number, number[]>()

    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i)
      if (!groups.has(root)) {
        groups.set(root, [])
      }
      groups.get(root)!.push(i)
    }

    return Array.from(groups.values())
  }
}

/**
 * Normalize a string for comparison (lowercase, remove special chars, normalize whitespace)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
}

/**
 * Extract artist names from a track
 */
function getArtistNames(track: Track): string[] {
  return track.artists.map((artist) => artist.name)
}

/**
 * Normalize an array of artist names into a Set
 */
function normalizeArtistSet(artists: string[]): Set<string> {
  return new Set(artists.map((artist) => normalizeString(artist)))
}

/**
 * Check if two artist sets are equal (order-independent)
 */
function areArtistSetsEqual(set1: Set<string>, set2: Set<string>): boolean {
  if (set1.size !== set2.size) return false
  for (const artist of set1) {
    if (!set2.has(artist)) return false
  }
  return true
}

/**
 * Check if subset is a (non-strict) subset of superset
 */
function isSubset<T>(subset: Set<T>, superset: Set<T>): boolean {
  for (const item of subset) {
    if (!superset.has(item)) return false
  }
  return true
}

/**
 * Check if one string is a subset of another (one contains the other)
 * Returns true if the smaller string is at least minLength characters
 */
function isStringSubset(
  str1: string,
  str2: string,
  minLength: number,
): boolean {
  const shorter = str1.length <= str2.length ? str1 : str2
  const longer = str1.length > str2.length ? str1 : str2

  // Check minimum length requirement
  if (shorter.length < minLength) return false

  // Check if shorter is contained in longer
  return longer.includes(shorter)
}

/**
 * Check if two tracks match based on strict criteria:
 * - Same song name (case insensitive)
 * - Same artist set (case insensitive, order independent)
 * - Duration within 2 seconds
 */
function matchesStrictCriteria(track1: Track, track2: Track): boolean {
  // Check duration (within 2000ms)
  const durationDiff = Math.abs(track1.duration_ms - track2.duration_ms)
  if (durationDiff > 2000) return false

  // Check song name (case insensitive)
  const name1 = normalizeString(track1.name)
  const name2 = normalizeString(track2.name)
  if (name1 !== name2) return false

  // Check artist sets (case insensitive, order independent)
  const artists1 = normalizeArtistSet(getArtistNames(track1))
  const artists2 = normalizeArtistSet(getArtistNames(track2))
  return areArtistSetsEqual(artists1, artists2)
}

/**
 * Check if two tracks match based on fuzzy criteria:
 * - Duration within 50ms
 * - Song name (normalized) is a subset of the other (min 3 chars)
 * - Artist set (normalized) is a non-strict subset of the other
 */
function matchesFuzzyCriteria(track1: Track, track2: Track): boolean {
  // Check duration (within 50ms)
  const durationDiff = Math.abs(track1.duration_ms - track2.duration_ms)
  if (durationDiff > 50) return false

  // Check song name subset (minimum 3 characters for smaller string)
  const name1 = normalizeString(track1.name)
  const name2 = normalizeString(track2.name)
  if (!isStringSubset(name1, name2, 3)) return false

  // Check artist subset (non-strict)
  const artists1 = normalizeArtistSet(getArtistNames(track1))
  const artists2 = normalizeArtistSet(getArtistNames(track2))

  // Check if either is a subset of the other
  return isSubset(artists1, artists2) || isSubset(artists2, artists1)
}

/**
 * Get the track object from a CombinedTrack
 */
function getTrack(combinedTrack: CombinedTrack): Track {
  return combinedTrack.track
}

/**
 * Determine the representative track for a group
 * Prefers tracks with shorter names and more complete metadata
 */
function getRepresentativeTrack(tracks: CombinedTrack[]): Track {
  if (tracks.length === 0) {
    throw new Error("Cannot get representative track from empty group")
  }

  // Sort by name length (shorter first), then by popularity (higher first)
  const sorted = [...tracks].sort((a, b) => {
    const trackA = getTrack(a)
    const trackB = getTrack(b)

    // Prefer shorter names
    const nameLengthDiff = trackA.name.length - trackB.name.length
    if (nameLengthDiff !== 0) return nameLengthDiff

    // Then prefer higher popularity
    return (trackB.popularity || 0) - (trackA.popularity || 0)
  })

  return getTrack(sorted[0])
}

/**
 * Groups similar tracks based on two matching criteria:
 *
 * Criterion 1 (Strict):
 * - Same song name (case insensitive)
 * - Same artist set (case insensitive, order independent)
 * - Duration within 2 seconds
 *
 * Criterion 2 (Fuzzy):
 * - Duration within 50ms
 * - Song name (normalized) is a subset of the other (min 3 chars for smaller)
 * - Artist set (normalized) is a non-strict subset of the other
 *
 * @param tracks - Array of combined tracks to group
 * @returns Array of track groups
 */
export function groupSimilarTracks(tracks: CombinedTrack[]): TrackGroup[] {
  // Filter out tracks without valid track data
  const validTracks = tracks.filter(
    (t) => t.track && t.track.id && t.track.name && t.track.duration_ms,
  )

  if (validTracks.length === 0) {
    return []
  }

  // Initialize Union-Find structure
  const uf = new UnionFind(validTracks.length)

  // Track which criteria were used for each group
  const groupStrictMatches = new Map<number, Set<string>>() // root -> set of "i-j" pairs
  const groupFuzzyMatches = new Map<number, Set<string>>() // root -> set of "i-j" pairs

  // Compare all pairs of tracks
  for (let i = 0; i < validTracks.length; i++) {
    for (let j = i + 1; j < validTracks.length; j++) {
      const track1 = getTrack(validTracks[i])
      const track2 = getTrack(validTracks[j])

      // Check if already in same group
      if (uf.find(i) === uf.find(j)) continue

      const pairKey = `${i}-${j}`
      let matched = false

      // Try strict match first
      if (matchesStrictCriteria(track1, track2)) {
        const root = uf.find(i)
        if (!groupStrictMatches.has(root)) {
          groupStrictMatches.set(root, new Set())
        }
        groupStrictMatches.get(root)!.add(pairKey)
        uf.union(i, j)
        matched = true
      }

      // Try fuzzy match (even if strict matched, to track all match types)
      if (matchesFuzzyCriteria(track1, track2)) {
        const root = uf.find(i)
        if (!groupFuzzyMatches.has(root)) {
          groupFuzzyMatches.set(root, new Set())
        }
        groupFuzzyMatches.get(root)!.add(pairKey)
        if (!matched) {
          uf.union(i, j)
        }
      }
    }
  }

  // Extract groups
  const indexGroups = uf.getGroups()

  // Convert to TrackGroup objects
  const trackGroups: TrackGroup[] = indexGroups.map((indices) => {
    const groupTracks = indices.map((i) => validTracks[i])
    const root = uf.find(indices[0])

    const hasStrictMatches =
      groupStrictMatches.has(root) && groupStrictMatches.get(root)!.size > 0
    const hasFuzzyMatches =
      groupFuzzyMatches.has(root) && groupFuzzyMatches.get(root)!.size > 0
    const isSingleTrack = groupTracks.length === 1

    return {
      tracks: groupTracks,
      representativeTrack: getRepresentativeTrack(groupTracks),
      matchReasons: {
        hasStrictMatches,
        hasFuzzyMatches,
        isSingleTrack,
      },
    }
  })

  return trackGroups
}

/**
 * Get statistics about the grouped tracks
 */
export function getGroupingStats(groups: TrackGroup[]) {
  const totalTracks = groups.reduce((sum, g) => sum + g.tracks.length, 0)
  const singleTrackGroups = groups.filter(
    (g) => g.matchReasons.isSingleTrack,
  ).length
  const multiTrackGroups = groups.filter(
    (g) => !g.matchReasons.isSingleTrack,
  ).length
  const strictOnlyGroups = groups.filter(
    (g) => g.matchReasons.hasStrictMatches && !g.matchReasons.hasFuzzyMatches,
  ).length
  const fuzzyOnlyGroups = groups.filter(
    (g) => !g.matchReasons.hasStrictMatches && g.matchReasons.hasFuzzyMatches,
  ).length
  const mixedGroups = groups.filter(
    (g) => g.matchReasons.hasStrictMatches && g.matchReasons.hasFuzzyMatches,
  ).length

  const largestGroup = groups.reduce(
    (max, g) => (g.tracks.length > max ? g.tracks.length : max),
    0,
  )

  return {
    totalGroups: groups.length,
    totalTracks,
    singleTrackGroups,
    multiTrackGroups,
    strictOnlyGroups,
    fuzzyOnlyGroups,
    mixedGroups,
    largestGroup,
    averageGroupSize: totalTracks / groups.length,
  }
}
