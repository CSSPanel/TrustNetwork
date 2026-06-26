import redis from './'

// Default cache TTL in seconds (2 hours). Pass an explicit timeout to override.
export const cacheTimeout = 60 * 60 * 2

export const getCache = async <T>(key: string): Promise<T | null> => {
	try {
		const cache = await redis.get(key)
		if (!cache) return null

		return JSON.parse(cache) as T // Cache is valid
	} catch (err) {
		console.error('GetCache', `Couldn't get cache for key ${key}, error: ${err}`)
		return null
	}
}

/**
 * Set a cache key with data and timeout
 * @param key Cache key
 * @param data Data to cache
 * @param timeout Timeout in seconds
 */
const setCache = async (key: string, data: unknown, timeout: number = cacheTimeout) => {
	try {
		await redis.set(key, JSON.stringify(data, replacer), 'EX', timeout)
	} catch (err) {
		console.error('SetCache', `Couldn't set cache for key ${key}, error: ${err}`)
	}
}

/** Delete a cache key — e.g. to force a fresh fetch on the next read. */
export const delCache = async (key: string) => {
	try {
		await redis.del(key)
	} catch (err) {
		console.error('DelCache', `Couldn't delete cache for key ${key}, error: ${err}`)
	}
}

// biome-ignore lint/suspicious/noExplicitAny: bigint values aren't JSON-serializable
const replacer = (key: string, value: any) => (typeof value === 'bigint' ? value.toString() : value)

export default setCache
