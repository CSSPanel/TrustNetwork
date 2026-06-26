import { chalk } from 'logestic'
import Redis from 'ioredis'

const { REDIS_HOST, REDIS_PASSWORD, REDIS_USER, REDIS_PORT } = Bun.env

if (!REDIS_HOST) throw new Error('REDIS_HOST not defined')
if (!REDIS_USER) throw new Error('REDIS_USER not defined')
if (!REDIS_PASSWORD) throw new Error('REDIS_PASSWORD not defined')
if (!REDIS_PORT) throw new Error('REDIS_PORT not defined')

const redis = new Redis({
	host: REDIS_HOST,
	username: REDIS_USER,
	password: REDIS_PASSWORD,
	port: Number(REDIS_PORT),
	family: 4,
	connectTimeout: 10000,
	// commandTimeout intentionally omitted: BullMQ workers use blocking BRPOP
	// commands that outlive any short timeout, and they inherit this config via duplicate()
	retryStrategy: (times) => Math.min(times * 200, 5000),
})

redis.on('connect', () => {
	console.log(`${chalk.yellowBright('[Redis]')} Connected`)
})

redis.on('ready', () => {
	console.log(`${chalk.yellowBright('[Redis]')} Ready`)
})

redis.on('error', (error) => {
	console.error(`${chalk.yellowBright('[Redis]')} Error: ${error?.message ?? error}`)
})

export default redis
