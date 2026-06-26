import { loadCommunityUrls } from './config'
import { fetchCommunityMeta } from './metadata'
import type { Community } from './types'

// In-memory registry of active, sharing-enabled communities, keyed by id (hostname).
const registry = new Map<string, Community>()
let initialized = false

/**
 * Stable map key for a panel. Uses host (incl. port when non-default) plus any
 * base path, so it stays clean for distinct subdomains (e.g. "bans.next-il.co.il")
 * yet remains unique when panels share a host (different port or path-mounted).
 */
function communityId(baseUrl: string): string {
	try {
		const u = new URL(baseUrl)
		return `${u.host}${u.pathname.replace(/\/+$/, '')}`
	} catch {
		return baseUrl
	}
}

/**
 * Load the config and probe each panel for its title/favicon. Safe to call once
 * at startup; probing runs in parallel and never blocks on a slow/dead panel.
 */
export async function initFederation(): Promise<void> {
	const urls = await loadCommunityUrls()

	const entries = await Promise.all(
		urls.map(async (url): Promise<Community> => {
			const id = communityId(url)
			const meta = await fetchCommunityMeta(url)
			return { id, url, title: meta.title ?? id, favicon: meta.favicon }
		}),
	)

	registry.clear()
	for (const c of entries) registry.set(c.id, c)
	initialized = true

	const ids = Array.from(registry.keys())
	console.info(
		`[federation] Registered ${ids.length} communit${ids.length === 1 ? 'y' : 'ies'}: ${ids.join(', ') || '(none)'}`,
	)
}

export function getCommunities(): Community[] {
	return Array.from(registry.values())
}

export function getCommunity(id: string): Community | undefined {
	return registry.get(id)
}

export function isFederationReady(): boolean {
	return initialized
}

/**
 * Drop a community that has opted out of sharing so we stop querying it for the
 * rest of this runtime. The on-disk config is intentionally left untouched: a
 * restart re-probes it, so a community that re-enables sharing comes back
 * automatically.
 */
export function disableCommunity(id: string, httpStatus?: number): void {
	const c = registry.get(id)
	registry.delete(id)
	const label = c?.title ?? id
	console.error(
		`[federation] Community "${label}" (${id}) disabled sharing${httpStatus ? ` [HTTP ${httpStatus}]` : ''} — removed from the federation registry`,
	)
}
