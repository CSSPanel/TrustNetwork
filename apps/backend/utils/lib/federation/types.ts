/**
 * CS2-SimpleAdmin punishment shapes (subset). The real panels store many more
 * columns; only the fields shared across the federation are modelled here so the
 * Federation* picks below resolve without pulling in the full panel schema.
 */
export type SA_BanStatus = 'ACTIVE' | 'UNBANNED' | 'EXPIRED'
export type SA_MuteStatus = 'ACTIVE' | 'UNMUTED' | 'EXPIRED'
export type SA_MuteType = 'GAG' | 'MUTE' | 'SILENCE'

export interface SA_Ban {
	reason: string
	/** Minutes; 0 means permanent. */
	duration: number
	status: SA_BanStatus
	/** ISO timestamp the ban was created. */
	created: string
	/** ISO timestamp the ban ends, or null when permanent. */
	ends: string | null
}

export interface SA_Mute {
	reason: string
	/** Minutes; 0 means permanent. */
	duration: number
	status: SA_MuteStatus
	type: SA_MuteType
	created: string
	ends: string | null
}

/** The slice of a ban a community shares with the federation. */
export interface FederationBan {
	reason: SA_Ban['reason']
	duration: SA_Ban['duration']
	status: SA_Ban['status']
	created: SA_Ban['created']
	ends: SA_Ban['ends']
}

/** The slice of a mute a community shares with the federation. */
export interface FederationMute {
	reason: SA_Mute['reason']
	duration: SA_Mute['duration']
	status: SA_Mute['status']
	type: SA_Mute['type']
	created: SA_Mute['created']
	ends: SA_Mute['ends']
}

/** Exact JSON each CSSPanel returns from /users/:steamId/punishments. */
export interface FederationPunishmentsResponse {
	steamid: string
	reports: number
	bans: FederationBan[]
	mutes: FederationMute[]
}

/** A registered, sharing-enabled community panel. */
export interface Community {
	/** Stable key (panel hostname) used as the map key in aggregated responses. */
	id: string
	/** Panel base URL, no trailing slash, e.g. https://bans.next-il.co.il */
	url: string
	/** Panel <title> resolved at startup; falls back to the hostname. */
	title: string
	/** Absolute favicon URL resolved at startup, or null when none was found. */
	favicon: string | null
}

/** One community's punishments plus the display metadata for that community. */
export interface CommunityPunishments extends FederationPunishmentsResponse {
	community: Community
}
