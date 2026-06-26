import {
	buildPunishmentsPath,
	FEDERATION_REQUEST_TIMEOUT_MS,
	FEDERATION_USER_AGENT,
} from '../../constants/Federation'
import { disableCommunity } from './registry'
import type {
	Community,
	CommunityPunishments,
	FederationBan,
	FederationMute,
	FederationPunishmentsResponse,
} from './types'

/**
 * Query one community panel for a player's punishments.
 *
 * Returns `null` when the community should be skipped:
 *  - 403 / 404  → the panel opted out of sharing → removed from the registry
 *                 (logged via disableCommunity) for the rest of this runtime.
 *  - other non-2xx, network error, timeout, bad JSON → transient, kept in the
 *    registry and simply skipped for this request.
 */
export async function fetchCommunityPunishments(
	community: Community,
	steamId: string,
): Promise<CommunityPunishments | null> {
	const url = `${community.url}${buildPunishmentsPath(steamId)}`

	try {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(FEDERATION_REQUEST_TIMEOUT_MS),
			headers: { 'user-agent': FEDERATION_USER_AGENT, accept: 'application/json' },
			redirect: 'follow',
		})

		// Explicit opt-out: the panel forbids (403) or no longer exposes (404) the route.
		if (res.status === 403 || res.status === 404) {
			disableCommunity(community.id, res.status)
			return null
		}
		if (!res.ok) {
			console.warn(`[federation] ${community.id} returned HTTP ${res.status} — skipping`)
			return null
		}

		const json = (await res.json()) as Partial<FederationPunishmentsResponse>
		return normalize(community, steamId, json)
	} catch (err) {
		console.warn(
			`[federation] ${community.id} request failed — skipping:`,
			err instanceof Error ? err.message : err,
		)
		return null
	}
}

/** Defensively coerce a panel response into our shape, tolerating missing fields. */
function normalize(
	community: Community,
	steamId: string,
	json: Partial<FederationPunishmentsResponse>,
): CommunityPunishments {
	return {
		community,
		steamid: typeof json.steamid === 'string' ? json.steamid : steamId,
		reports: typeof json.reports === 'number' && Number.isFinite(json.reports) ? json.reports : 0,
		bans: Array.isArray(json.bans) ? (json.bans as FederationBan[]) : [],
		mutes: Array.isArray(json.mutes) ? (json.mutes as FederationMute[]) : [],
	}
}
