import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
	if (!redis) {
		redis = new Redis(process.env.REDIS_URL);

		redis.on("error", (err) => {
			console.error("Redis connection error:", err);
		});

		redis.on("connect", () => {
			console.log("Redis connected");
		});
	}

	return redis;
}

export async function closeRedis(): Promise<void> {
	if (redis) {
		await redis.quit();
		redis = null;
	}
}

export function getCacheKey(type: string, id: string): string {
	return `spotify:${type}:${id}`;
}

export async function getCached<T>(key: string): Promise<T | null> {
	try {
		const redis = getRedis();
		const data = await redis.get(key);
		if (!data) return null;
		return JSON.parse(data) as T;
	} catch (error) {
		console.error(`Error getting cached data for key ${key}:`, error);
		return null;
	}
}

export async function setCached<T>(
	key: string,
	value: T,
	ttl: number,
): Promise<void> {
	try {
		const redis = getRedis();
		await redis.setex(key, ttl, JSON.stringify(value));
	} catch (error) {
		console.error(`Error setting cached data for key ${key}:`, error);
	}
}

export async function deleteCached(key: string): Promise<void> {
	try {
		const redis = getRedis();
		await redis.del(key);
	} catch (error) {
		console.error(`Error deleting cached data for key ${key}:`, error);
	}
}

export async function getCachedMany<T>(keys: string[]): Promise<(T | null)[]> {
	if (keys.length === 0) return [];

	try {
		const redis = getRedis();
		const values = await redis.mget(...keys);
		return values.map((val) => (val ? (JSON.parse(val) as T) : null));
	} catch (error) {
		console.error("Error getting multiple cached values:", error);
		return keys.map(() => null);
	}
}

export async function setCachedMany<T>(
	items: Array<{ key: string; value: T; ttl: number }>,
): Promise<void> {
	if (items.length === 0) return;

	try {
		const redis = getRedis();
		const pipeline = redis.pipeline();

		for (const item of items) {
			pipeline.setex(item.key, item.ttl, JSON.stringify(item.value));
		}

		await pipeline.exec();
	} catch (error) {
		console.error("Error setting multiple cached values:", error);
	}
}
