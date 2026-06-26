import type { Community, PlayerReputation } from './types'

// Inlined at build time via next.config.js `env.API`.
const API = (process.env.API || '').replace(/\/$/, '')

/** The active, sharing-enabled communities in the federation (with title + favicon). */
export async function getCommunities(): Promise<Community[]> {
	const res = await fetch(`${API}/communities`)
	if (!res.ok) throw new Error(`Failed to load communities (${res.status})`)
	return res.json()
}

/** A player's aggregated cross-community reputation. `refresh` bypasses the server cache. */
export async function getPlayer(steamId: string, refresh = false): Promise<PlayerReputation> {
	const res = await fetch(`${API}/players/${steamId}${refresh ? '?refresh=true' : ''}`)
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { error?: string } | null
		throw new Error(body?.error || `Lookup failed (${res.status})`)
	}
	return res.json()
}
