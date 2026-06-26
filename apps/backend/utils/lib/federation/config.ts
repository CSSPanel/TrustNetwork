import { COMMUNITIES_CONFIG_PATH } from '../../constants/Federation'

/**
 * Read the federated community list from disk and normalise it to a clean,
 * de-duplicated array of base URLs. Accepts either a bare array or an object
 * of the form `{ "communities": [...] }`. Never throws — a bad/missing config
 * just yields an empty federation.
 */
export async function loadCommunityUrls(): Promise<string[]> {
	const file = Bun.file(COMMUNITIES_CONFIG_PATH)

	if (!(await file.exists())) {
		console.warn(`[federation] No community config at ${COMMUNITIES_CONFIG_PATH} — federation is empty`)
		return []
	}

	try {
		const raw: unknown = await file.json()
		const list: unknown = Array.isArray(raw)
			? raw
			: (raw as { communities?: unknown })?.communities

		if (!Array.isArray(list)) {
			console.error('[federation] Community config must be an array or { "communities": [...] }')
			return []
		}

		const urls = list
			.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
			.map(normalizeBaseUrl)
			.filter((u): u is string => u !== null)

		return Array.from(new Set(urls))
	} catch (err) {
		console.error('[federation] Failed to parse community config:', err)
		return []
	}
}

/** Coerce to a proper origin (+ optional base path), drop trailing slashes/query/hash. */
function normalizeBaseUrl(input: string): string | null {
	try {
		const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`
		const url = new URL(withProto)
		return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
	} catch {
		console.error(`[federation] Skipping invalid community URL: ${input}`)
		return null
	}
}
