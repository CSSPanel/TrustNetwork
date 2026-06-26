// Frontend mirror of the backend's GET /players/:steamId and GET /communities
// responses. Kept in sync by hand so the UI stays decoupled from the backend build.

export type TrustLevel = 'trusted' | 'neutral' | 'caution' | 'risky'

export interface TrustFactor {
	key: string
	label: string
	count: number
	weight: number
	penalty: number
	capped?: boolean
}

export interface TrustCalculation {
	base: number
	communitiesQueried: number
	factors: TrustFactor[]
	penaltyTotal: number
	csrep: {
		rating: number | null
		weight: number
		applied: boolean
		scoreBeforeBlend: number
		scoreAfterBlend: number
	}
	finalScore: number
}

export interface PunishmentWeights {
	active: { permanent: number; temporary: number }
	past: { permanent: number; temporary: number }
}

export interface TrustConfig {
	baseScore: number
	ban: PunishmentWeights
	mute: PunishmentWeights
	report: { perReport: number; maxPenalty: number }
	csrep: { weight: number }
	levels: { trusted: number; neutral: number; caution: number }
}

export interface TrustScore {
	score: number
	level: TrustLevel
	config: TrustConfig
	calculation: TrustCalculation
	provisional: boolean
}

export type SA_BanStatus = 'ACTIVE' | 'UNBANNED' | 'EXPIRED'
export type SA_MuteStatus = 'ACTIVE' | 'UNMUTED' | 'EXPIRED'
export type SA_MuteType = 'GAG' | 'MUTE' | 'SILENCE'

export interface FederationBan {
	reason: string
	duration: number
	status: SA_BanStatus
	created: string
	ends: string | null
}

export interface FederationMute {
	reason: string
	duration: number
	status: SA_MuteStatus
	type: SA_MuteType
	created: string
	ends: string | null
}

export interface Community {
	id: string
	url: string
	title: string
	favicon: string | null
}

export interface CommunityPunishments {
	community: Community
	steamid: string
	reports: number
	bans: FederationBan[]
	mutes: FederationMute[]
}

/** The subset of the csrep profile the UI renders. */
export interface CSREPPlayer {
	name: string
	avatar: string
	steam_level: number | null
	steam_vanity_url: string | null
	cs2_hours: number | null
	faceit_url: string | null
	faceit_level: number | null
	faceit_elo: number | null
	premier_elo: number | null
	trust_rating: number | null
	bans: Record<string, unknown>
	[key: string]: unknown
}

export interface PlayerReputation {
	steamid: string
	csrep: CSREPPlayer | null
	communities: Record<string, CommunityPunishments>
	trust: TrustScore
	fetchedAt: string
}
