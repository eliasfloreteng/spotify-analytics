import type { FetchAllDataResult } from "./spotify-data-fetcher"
import type { TrackGroup } from "./song-deduplication"

const STORAGE_VERSION = 1
const STORAGE_KEY = "spotify-analytics-data"
const TIMESTAMP_KEY = "spotify-analytics-timestamp"

export interface PersistedData {
  version: number
  timestamp: number
  dataResult: FetchAllDataResult
  trackGroups: TrackGroup[]
}

/**
 * Save data to localStorage
 */
export function saveToLocalStorage(
  dataResult: FetchAllDataResult,
  trackGroups: TrackGroup[],
): boolean {
  try {
    const data: PersistedData = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      dataResult,
      trackGroups,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString())

    console.log("Data saved to localStorage successfully")
    return true
  } catch (error) {
    console.error("Error saving to localStorage:", error)

    // Handle quota exceeded error
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.error("localStorage quota exceeded. Clearing old data...")
      clearLocalStorage()
    }

    return false
  }
}

/**
 * Load data from localStorage
 */
export function loadFromLocalStorage(): PersistedData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      console.log("No cached data found")
      return null
    }

    const data = JSON.parse(stored) as PersistedData

    // Validate data structure
    if (
      !data.version ||
      !data.timestamp ||
      !data.dataResult ||
      !data.trackGroups
    ) {
      console.warn("Invalid cached data structure, clearing...")
      clearLocalStorage()
      return null
    }

    // Check version compatibility
    if (data.version !== STORAGE_VERSION) {
      console.warn("Cached data version mismatch, clearing...")
      clearLocalStorage()
      return null
    }

    console.log(
      `Loaded cached data from ${new Date(data.timestamp).toLocaleString()}`,
    )
    return data
  } catch (error) {
    console.error("Error loading from localStorage:", error)
    clearLocalStorage()
    return null
  }
}

/**
 * Clear all cached data
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TIMESTAMP_KEY)
    console.log("Cached data cleared")
  } catch (error) {
    console.error("Error clearing localStorage:", error)
  }
}

/**
 * Get the timestamp of when data was last fetched
 */
export function getLastFetchTimestamp(): number | null {
  try {
    const timestamp = localStorage.getItem(TIMESTAMP_KEY)
    return timestamp ? parseInt(timestamp, 10) : null
  } catch (error) {
    console.error("Error getting timestamp:", error)
    return null
  }
}

/**
 * Check if cached data is older than specified days
 */
export function isCacheOlderThan(days: number): boolean {
  const timestamp = getLastFetchTimestamp()
  if (!timestamp) return true

  const ageInMs = Date.now() - timestamp
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24)

  return ageInDays > days
}

/**
 * Get cache age in days
 */
export function getCacheAgeInDays(): number | null {
  const timestamp = getLastFetchTimestamp()
  if (!timestamp) return null

  const ageInMs = Date.now() - timestamp
  return ageInMs / (1000 * 60 * 60 * 24)
}

/**
 * Format cache age for display
 */
export function formatCacheAge(): string | null {
  const ageInDays = getCacheAgeInDays()
  if (ageInDays === null) return null

  if (ageInDays < 1) {
    const hours = Math.floor(ageInDays * 24)
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  } else if (ageInDays < 30) {
    const days = Math.floor(ageInDays)
    return days === 1 ? "1 day ago" : `${days} days ago`
  } else {
    const months = Math.floor(ageInDays / 30)
    return months === 1 ? "1 month ago" : `${months} months ago`
  }
}
