import type { CSREPPlayerEntity } from '../csrep'
import { getTrustConfig, type TrustConfig } from './trustConfig'
import type { CommunityPunishments } from './types'

export type TrustLevel = 'trusted' | 'neutral' | 'caution' | 'risky'

/** One line of the score math: a category of signal and what it deducted. */
export interface TrustFactor {
	/** Stable key, e.g. "ban.active.permanent", "csrep.vac" or "reports". */
	key: string
	label: string
	count: number
	/** Per-item weight from the config. */
	weight: number
	/** Actual points deducted (count * weight, except reports which are capped). */
	penalty: number
	/** Present on the reports factor when the cap was hit. */
	capped?: boolean
}

/** The full, reconstructable derivation of a player's score. */
export interface TrustCalculation {
	base: number
	communitiesQueried: number
	/** Every penalty that applied (count > 0), in deduction order. */
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

export interface TrustScore {
	/** 0–100, higher is more trustworthy. PROVISIONAL — see `provisional`. */
	score: number
	level: TrustLevel
	/** The weights used for this calculation (shared so the result is reproducible). */
	config: TrustConfig
	/** Step-by-step derivation of `score`. */
	calculation: TrustCalculation
	/** Flags this as the placeholder heuristic, not the final model. */
	provisional: true
}

/** Duration 0 means an infinite/permanent punishment. */
const isPermanent = (p: { duration: number }): boolean => p.duration <= 0

type PunishmentTally = { active: { permanent: number; temporary: number }; past: { temporary: number } }

/**
 * Bucket a punishment by status + duration.
 * A reversed/expired *permanent* punishment (duration 0 but not ACTIVE) is ignored
 * entirely — an unbanned permanent ban no longer counts against the player.
 */
function classify(p: { duration: number; status: string }, into: PunishmentTally): void {
	const active = p.status === 'ACTIVE'
	const permanent = isPermanent(p)
	if (permanent && !active) return // reversed permanent punishment → ignore
	if (active) into.active[permanent ? 'permanent' : 'temporary']++
	else into.past.temporary++
}

/**
 * Compute a player's trust score from federated punishments + csrep.
 *
 * Weights come from config/trust.json (see trustConfig.ts) so the model is
 * tunable without code changes. The returned `config` + `calculation` make every
 * deduction transparent. Still PROVISIONAL — the shape is final, the weights aren't.
 */
export function computeTrustScore(
	communities: CommunityPunishments[],
	csrep: CSREPPlayerEntity | null,
	config: TrustConfig = getTrustConfig(),
): TrustScore {
	const tally = {
		ban: { active: { permanent: 0, temporary: 0 }, past: { temporary: 0 } } as PunishmentTally,
		mute: { active: { permanent: 0, temporary: 0 }, past: { temporary: 0 } } as PunishmentTally,
		reports: 0,
	}

	for (const c of communities) {
		tally.reports += c.reports
		for (const b of c.bans) classify(b, tally.ban)
		for (const m of c.mutes) classify(m, tally.mute)
	}

	const factors: TrustFactor[] = []
	const add = (key: string, label: string, count: number, weight: number) => {
		if (count > 0) factors.push({ key, label, count, weight, penalty: count * weight })
	}

	// Community punishments.
	add('ban.active.permanent', 'Active permanent bans', tally.ban.active.permanent, config.ban.active.permanent)
	add('ban.active.temporary', 'Active temporary bans', tally.ban.active.temporary, config.ban.active.temporary)
	add('ban.past.temporary', 'Past temporary bans', tally.ban.past.temporary, config.ban.past.temporary)
	add('mute.active.permanent', 'Active permanent mutes', tally.mute.active.permanent, config.mute.active.permanent)
	add('mute.active.temporary', 'Active temporary mutes', tally.mute.active.temporary, config.mute.active.temporary)
	add('mute.past.temporary', 'Past temporary mutes', tally.mute.past.temporary, config.mute.past.temporary)

	// csrep hard ban flags — global cheater signals from csrep.gg.
	const cb = (csrep?.bans ?? {}) as Record<string, unknown>
	const addFlag = (key: string, label: string, flagged: unknown, weight: number) => {
		if (flagged === true) factors.push({ key, label, count: 1, weight, penalty: weight })
	}
	addFlag('csrep.vac', 'VAC ban (csrep)', cb.vac, config.csrep.bans.vac)
	addFlag('csrep.game', 'Game ban (csrep)', cb.game, config.csrep.bans.game)
	addFlag('csrep.overwatch', 'Overwatch ban (csrep)', cb.overwatch, config.csrep.bans.overwatch)
	addFlag('csrep.faceit', 'FACEIT ban (csrep)', cb.faceit, config.csrep.bans.faceit)
	addFlag('csrep.economy', 'Economy ban (csrep)', cb.economy, config.csrep.bans.economy)

	// Reports: linear per report, capped so a brigade can't zero someone out.
	if (tally.reports > 0) {
		const raw = tally.reports * config.report.perReport
		const penalty = Math.min(raw, config.report.maxPenalty)
		factors.push({
			key: 'reports',
			label: 'Reports received',
			count: tally.reports,
			weight: config.report.perReport,
			penalty,
			capped: penalty < raw,
		})
	}

	const penaltyTotal = factors.reduce((sum, f) => sum + f.penalty, 0)
	let score = config.baseScore - penaltyTotal

	// Blend csrep's own trust rating (0–100) when present.
	const rating = typeof csrep?.trust_rating === 'number' ? csrep.trust_rating : null
	const applied = rating !== null
	const scoreBeforeBlend = score
	if (applied) score = score * (1 - config.csrep.ratingWeight) + rating * config.csrep.ratingWeight
	const scoreAfterBlend = score

	const finalScore = Math.max(0, Math.min(100, Math.round(score)))

	return {
		score: finalScore,
		level: toLevel(finalScore, config.levels),
		config,
		calculation: {
			base: config.baseScore,
			communitiesQueried: communities.length,
			factors,
			penaltyTotal,
			csrep: { rating, weight: config.csrep.ratingWeight, applied, scoreBeforeBlend, scoreAfterBlend },
			finalScore,
		},
		provisional: true,
	}
}

function toLevel(score: number, levels: TrustConfig['levels']): TrustLevel {
	if (score >= levels.trusted) return 'trusted'
	if (score >= levels.neutral) return 'neutral'
	if (score >= levels.caution) return 'caution'
	return 'risky'
}
