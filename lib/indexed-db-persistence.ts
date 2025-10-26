import type { FetchAllDataResult } from "./spotify-data-fetcher"
import type { TrackGroup } from "./song-deduplication"

const DB_NAME = "spotify-analytics-db"
const DB_VERSION = 1
const STORE_NAME = "analytics-data"
const DATA_KEY = "spotify-data"

export interface PersistedData {
  version: number
  timestamp: number
  dataResult: FetchAllDataResult
  trackGroups: TrackGroup[]
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Save data to IndexedDB
 */
export async function saveToIndexedDB(
  dataResult: FetchAllDataResult,
  trackGroups: TrackGroup[],
): Promise<boolean> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const data: PersistedData = {
      version: DB_VERSION,
      timestamp: Date.now(),
      dataResult,
      trackGroups,
    }

    return new Promise((resolve, reject) => {
      const request = store.put(data, DATA_KEY)

      request.onsuccess = () => {
        console.log("Data saved to IndexedDB successfully")
        resolve(true)
      }

      request.onerror = () => {
        console.error("Error saving to IndexedDB:", request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error saving to IndexedDB:", error)
    return false
  }
}

/**
 * Load data from IndexedDB
 */
export async function loadFromIndexedDB(): Promise<PersistedData | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(DATA_KEY)

      request.onsuccess = () => {
        const data = request.result as PersistedData | undefined

        if (!data) {
          console.log("No cached data found in IndexedDB")
          resolve(null)
          return
        }

        // Validate data structure
        if (
          !data.version ||
          !data.timestamp ||
          !data.dataResult ||
          !data.trackGroups
        ) {
          console.warn("Invalid cached data structure, clearing...")
          clearIndexedDB()
          resolve(null)
          return
        }

        console.log(
          `Loaded cached data from ${new Date(data.timestamp).toLocaleString()}`,
        )
        resolve(data)
      }

      request.onerror = () => {
        console.error("Error loading from IndexedDB:", request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error loading from IndexedDB:", error)
    return null
  }
}

/**
 * Clear all cached data from IndexedDB
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(DATA_KEY)

      request.onsuccess = () => {
        console.log("Cached data cleared from IndexedDB")
        resolve()
      }

      request.onerror = () => {
        console.error("Error clearing IndexedDB:", request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error clearing IndexedDB:", error)
  }
}

/**
 * Get the timestamp of when data was last fetched
 */
export async function getLastFetchTimestamp(): Promise<number | null> {
  try {
    const data = await loadFromIndexedDB()
    return data?.timestamp || null
  } catch (error) {
    console.error("Error getting timestamp:", error)
    return null
  }
}

/**
 * Check if cached data is older than specified days
 */
export async function isCacheOlderThan(days: number): Promise<boolean> {
  const timestamp = await getLastFetchTimestamp()
  if (!timestamp) return true

  const ageInMs = Date.now() - timestamp
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24)

  return ageInDays > days
}

/**
 * Get cache age in days
 */
export async function getCacheAgeInDays(): Promise<number | null> {
  const timestamp = await getLastFetchTimestamp()
  if (!timestamp) return null

  const ageInMs = Date.now() - timestamp
  return ageInMs / (1000 * 60 * 60 * 24)
}

/**
 * Format cache age for display
 */
export function formatCacheAge(timestamp: number): string {
  const ageInMs = Date.now() - timestamp
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24)

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
