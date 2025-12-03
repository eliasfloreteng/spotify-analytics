import Redis from "ioredis"

let redis: Redis | null = null

export function getRedis(): Redis {
	if (!redis) {
		redis = new Redis(process.env.REDIS_URL)

		redis.on("error", (err) => {
			console.error("Redis connection error:", err)
		})

		redis.on("connect", () => {
			console.log("Redis connected")
		})
	}

	return redis
}

export async function closeRedis(): Promise<void> {
	if (redis) {
		await redis.quit()
		redis = null
	}
}
