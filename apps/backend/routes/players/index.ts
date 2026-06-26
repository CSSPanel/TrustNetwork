import Elysia, { t } from 'elysia'
import {
	PLAYER_CACHE_TTL_SECONDS,
	PLAYER_REFRESH_MIN_AGE_SECONDS,
	playerCacheKey,
	STEAM64_REGEX,
} from '../../utils/constants/Federation'
import setCache, { getCache } from '../../utils/lib/cache'
import { type CSREPPlayerEntity, getCSREPPlayerSafe } from '../../utils/lib/csrep'
import {
	type CommunityPunishments,
	computeTrustScore,
	fetchCommunityPunishments,
	getCommunities,
	reloadTrustConfig,
	type TrustScore,
} from '../../utils/lib/federation'

/** Aggregated, cross-community reputation for a single player. */
export interface PlayerReputation {
	steamid: string
	csrep: CSREPPlayerEntity | null
	// Keyed by community id (hostname) so the frontend can render per-community.
	communities: Record<string, CommunityPunishments>
	trust: TrustScore
	/** ISO timestamp the underlying data was fetched — not when it was served from cache. */
	fetchedAt: string
}

const PlayersRoutes = new Elysia({
	detail: {
		tags: ['Players'],
	},
}).get(
	'/:steamId',
	async ({ params: { steamId }, query, error }) => {
		if (!STEAM64_REGEX.test(steamId)) {
			return error(400, { error: 'Invalid steam64 id (expected 17 digits)' })
		}

		const cacheKey = playerCacheKey(steamId)
		const refreshRequested = query.refresh === 'true'

		// Read-through redis cache (TTL ~12h).
		const cached = await getCache<PlayerReputation>(cacheKey)
		if (cached) {
			if (!refreshRequested) return cached

			// `?refresh=true` is throttled: only refetch once the entry is past half
			// its lifetime, so repeated refreshes can't hammer csrep/the panels. A
			// corrupt/missing fetchedAt yields NaN here → falls through and refetches.
			const ageSeconds = (Date.now() - new Date(cached.fetchedAt).getTime()) / 1000
			if (ageSeconds < PLAYER_REFRESH_MIN_AGE_SECONDS) return cached
		}

		// (Re)fetching. On an explicit refresh, re-read config/trust.json too so
		// weight edits apply without a restart.
		if (refreshRequested) reloadTrustConfig()

		// csrep first (used by the trust score), then fan out to the panels.
		const csrep = await getCSREPPlayerSafe(steamId)

		const active = getCommunities()
		const settled = await Promise.allSettled(
			active.map(c => fetchCommunityPunishments(c, steamId)),
		)

		// Stack each community's response under its id; skipped communities (null
		// results / rejected promises) are simply absent from the map.
		const communities: Record<string, CommunityPunishments> = {}
		for (const r of settled) {
			if (r.status === 'fulfilled' && r.value) communities[r.value.community.id] = r.value
		}

		const trust = computeTrustScore(Object.values(communities), csrep)

		const result: PlayerReputation = {
			steamid: steamId,
			csrep,
			communities,
			trust,
			fetchedAt: new Date().toISOString(),
		}

		// Only cache meaningful results: don't freeze a total outage (csrep down AND
		// no community responded) for the full TTL.
		if (csrep || Object.keys(communities).length > 0) {
			await setCache(cacheKey, result, PLAYER_CACHE_TTL_SECONDS)
		}

		return result
	},
	{
		detail: {
			summary: "Aggregate a player's csrep profile + punishments across all federated communities",
		},
		params: t.Object({
			steamId: t.String(),
		}),
		query: t.Object({
			refresh: t.Optional(t.String()),
		}),
	},
)

export default PlayersRoutes
