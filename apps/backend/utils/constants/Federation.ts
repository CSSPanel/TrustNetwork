import { join } from 'node:path'

// Source-of-truth list of community panel base URLs. Read once at startup.
// Override the location with the COMMUNITIES_CONFIG env var if needed.
export const COMMUNITIES_CONFIG_PATH =
	Bun.env.COMMUNITIES_CONFIG ?? join(process.cwd(), 'config', 'communities.json')

// The route every CSSPanel exposes to share a player's punishments (steam64 id).
// Mounted under the panel's /api base; the config URL is the panel origin
// (also used for the startup title/favicon probe of the homepage).
export const buildPunishmentsPath = (steamId: string) => `/api/users/${steamId}/punishments`

// Per-request timeout when querying a community panel for punishments.
export const FEDERATION_REQUEST_TIMEOUT_MS = 6_000

// Per-request timeout when probing a panel for its <title>/favicon at startup.
export const METADATA_REQUEST_TIMEOUT_MS = 5_000

// Sent on every outbound federation request so panels can identify the caller.
export const FEDERATION_USER_AGENT = 'TrustNetwork-Federation/1.0 (+https://csspanel.dev)'

// A steam64 id is exactly 17 digits.
export const STEAM64_REGEX = /^\d{17}$/

// Player reputation cache (redis). Half a day — punishments change rarely.
export const PLAYER_CACHE_TTL_SECONDS = 60 * 60 * 12
export const playerCacheKey = (steamId: string) => `player:${steamId}`

// `?refresh=true` only triggers a real refetch once the cached entry is at least
// this old (half the TTL = 6h). A still-fresh entry is returned as-is, so repeated
// refreshes can't hammer csrep/the panels.
export const PLAYER_REFRESH_MIN_AGE_SECONDS = PLAYER_CACHE_TTL_SECONDS / 2
