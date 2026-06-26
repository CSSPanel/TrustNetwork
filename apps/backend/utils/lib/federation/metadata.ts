import { FEDERATION_USER_AGENT, METADATA_REQUEST_TIMEOUT_MS } from '../../constants/Federation'

export interface CommunityMeta {
	title: string | null
	favicon: string | null
}

/**
 * Best-effort fetch of a panel's <title> and favicon so the federation can be
 * shown with names + icons instead of raw URLs. Never throws; on any failure it
 * returns nulls (with a guessed /favicon.ico) so registration still succeeds.
 */
export async function fetchCommunityMeta(baseUrl: string): Promise<CommunityMeta> {
	try {
		const res = await fetch(baseUrl, {
			signal: AbortSignal.timeout(METADATA_REQUEST_TIMEOUT_MS),
			headers: { 'user-agent': FEDERATION_USER_AGENT, accept: 'text/html' },
			redirect: 'follow',
		})
		if (!res.ok) return { title: null, favicon: defaultFavicon(baseUrl) }

		const html = await res.text()
		// Resolve relative hrefs against the final URL after any redirects.
		const resolveBase = res.url || baseUrl
		return {
			title: extractTitle(html),
			favicon: extractFavicon(html, resolveBase) ?? defaultFavicon(baseUrl),
		}
	} catch {
		return { title: null, favicon: defaultFavicon(baseUrl) }
	}
}

function extractTitle(html: string): string | null {
	const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
	if (!m) return null
	const title = decodeEntities(m[1].trim())
	return title.length ? title : null
}

function extractFavicon(html: string, baseUrl: string): string | null {
	const links = html.match(/<link\b[^>]*>/gi) ?? []
	let fallback: string | null = null

	for (const tag of links) {
		const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
		if (!rel || !rel.includes('icon')) continue

		const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
		if (!href) continue

		try {
			const abs = new URL(href, baseUrl).href
			// Prefer a plain favicon; otherwise keep the first icon-ish link we saw.
			if (rel === 'icon' || rel === 'shortcut icon') return abs
			fallback ??= abs
		} catch {
			/* ignore malformed href */
		}
	}

	return fallback
}

function defaultFavicon(baseUrl: string): string | null {
	try {
		return new URL('/favicon.ico', baseUrl).href
	} catch {
		return null
	}
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0*39;/g, "'")
		.replace(/&nbsp;/g, ' ')
}
