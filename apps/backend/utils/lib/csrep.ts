import axios from 'axios'

const CS_REP_API_URL = 'https://csrep.gg/api'

export const CSREP_KEY_ID = Bun.env.CSREP_KEY_ID
export const CSREP_SECRET = Bun.env.CSREP_SECRET

export const csrepApi = axios.create({
	baseURL: CS_REP_API_URL,
	headers: {
		'X-API-Key': CSREP_SECRET,
	},
})

export type CSREPStatus = 'OK' | 'ERROR'

export enum CSREPSteamStatus {
	Offline = 0,
	Online = 1,
	Busy = 2,
	Away = 3,
	Snooze = 4,
	LookingToTrade = 5,
	LookingToPlay = 6,
}

export interface CSREPUserEntityShort {
	id: string
	steam_id: string
	name: string
	avatar: string
	roles: string[]
	created_at: string
}

export interface CSREPPlayerEntity {
	id: string
	redacted: boolean
	anonymous: Record<string, unknown>
	name: string
	avatar: string
	steam_status: CSREPSteamStatus
	steam_active_game: string
	steam_level: number
	steam_vanity_url: string
	steam_created_at: string
	cs2_hours: number
	inventory_value: number
	faceit_id: string
	faceit_url: string
	faceit_level: number
	faceit_elo: number
	faceit_latest_match_date: string
	premier_elo: number
	trust_rating: number
	map_ranks: Record<string, unknown>
	bans: Record<string, unknown>
	commendations: Record<string, unknown>
	medals: string[]
	privacy: Record<string, unknown>
	refreshed_at: string
	created_at: string
	updated_at: string
	deleted_at: string
	user: CSREPUserEntityShort
}

export interface CSREPGetPlayerResponse {
	status: CSREPStatus
	result: CSREPPlayerEntity
}

export interface CSREPGetPlayersResponse {
	status: CSREPStatus
	result: CSREPPlayerEntity[]
}

export interface CSREPSearchPlayersResponse {
	status: CSREPStatus
	result: CSREPPlayerEntity[]
}

export const getCSREPPlayer = async (id: string) => {
	const { data } = await csrepApi.get<CSREPGetPlayerResponse>(`/players/${id}`)
	return data
}

/**
 * Like getCSREPPlayer but never throws — returns null on any failure (network,
 * non-OK status, missing result) so the federation aggregation can continue
 * even when csrep is unavailable.
 */
export const getCSREPPlayerSafe = async (id: string): Promise<CSREPPlayerEntity | null> => {
	try {
		const { status, result } = await getCSREPPlayer(id)
		if (status !== 'OK' || !result) return null
		return result
	} catch (err) {
		console.warn('[csrep] player lookup failed:', err instanceof Error ? err.message : err)
		return null
	}
}

export const getCSREPPlayers = async (ids: string[]) => {
	const { data } = await csrepApi.get<CSREPGetPlayersResponse>('/players', {
		params: { ids },
		paramsSerializer: { indexes: null },
	})
	return data
}

export const searchCSREPPlayers = async (query: string) => {
	const { data } = await csrepApi.get<CSREPSearchPlayersResponse>('/players/search', {
		params: { query },
	})
	return data
}
