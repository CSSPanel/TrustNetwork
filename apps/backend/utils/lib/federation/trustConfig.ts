import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface PunishmentWeights {
	/** Active punishments, by duration (permanent = duration 0, the critical signal). */
	active: { permanent: number; temporary: number }
	/**
	 * Lifted/expired punishments — only temporary ones count. A *reversed permanent*
	 * punishment (duration 0 but no longer ACTIVE, e.g. unbanned) is ignored entirely.
	 */
	past: { temporary: number }
}

export interface CSREPWeights {
	/** How much csrep's own trust_rating (0–100) is blended into the final score (0–1). */
	ratingWeight: number
	/** Flat penalties for csrep's hard ban flags (global signals from csrep.gg). */
	bans: { vac: number; game: number; overwatch: number; faceit: number; economy: number }
}

export interface TrustConfig {
	/** Score everyone starts from, before penalties. */
	baseScore: number
	/** Penalty per ban. */
	ban: PunishmentWeights
	/** Penalty per mute. */
	mute: PunishmentWeights
	/** Reports penalty: `perReport` each, capped at `maxPenalty`. */
	report: { perReport: number; maxPenalty: number }
	/** csrep signals — its trust rating plus hard ban flags. */
	csrep: CSREPWeights
	/** Inclusive lower bounds for each trust level; below `caution` is "risky". */
	levels: { trusted: number; neutral: number; caution: number }
}

export const DEFAULT_TRUST_CONFIG: TrustConfig = {
	baseScore: 100,
	// Permanent (duration 0) ACTIVE punishments are critical — a cheater-grade signal.
	ban: { active: { permanent: 75, temporary: 30 }, past: { temporary: 8 } },
	mute: { active: { permanent: 20, temporary: 6 }, past: { temporary: 1 } },
	report: { perReport: 2, maxPenalty: 20 },
	csrep: {
		ratingWeight: 0.3,
		bans: { vac: 40, game: 35, overwatch: 30, faceit: 20, economy: 5 },
	},
	levels: { trusted: 80, neutral: 55, caution: 30 },
}

const TRUST_CONFIG_PATH = Bun.env.TRUST_CONFIG ?? join(process.cwd(), 'config', 'trust.json')

let cached: TrustConfig | null = null

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }

/** Read + validate config/trust.json, merged onto the defaults. Falls back to defaults on any error. */
export function loadTrustConfig(): TrustConfig {
	try {
		const raw = JSON.parse(readFileSync(TRUST_CONFIG_PATH, 'utf8')) as DeepPartial<TrustConfig>
		return mergeConfig(DEFAULT_TRUST_CONFIG, raw)
	} catch (err) {
		console.warn(
			`[trust] Falling back to default config (couldn't load ${TRUST_CONFIG_PATH}):`,
			err instanceof Error ? err.message : err,
		)
		return DEFAULT_TRUST_CONFIG
	}
}

/** Memoized config (loaded once). Call reloadTrustConfig() to pick up on-disk edits. */
export function getTrustConfig(): TrustConfig {
	if (!cached) cached = loadTrustConfig()
	return cached
}

export function reloadTrustConfig(): TrustConfig {
	cached = loadTrustConfig()
	return cached
}

const num = (v: number | undefined, fallback: number): number =>
	typeof v === 'number' && Number.isFinite(v) ? v : fallback

const mergePunishment = (
	base: PunishmentWeights,
	o: DeepPartial<PunishmentWeights> | undefined,
): PunishmentWeights => ({
	active: {
		permanent: num(o?.active?.permanent, base.active.permanent),
		temporary: num(o?.active?.temporary, base.active.temporary),
	},
	past: {
		temporary: num(o?.past?.temporary, base.past.temporary),
	},
})

const mergeConfig = (base: TrustConfig, o: DeepPartial<TrustConfig> | undefined): TrustConfig => {
	if (!o || typeof o !== 'object') return base
	return {
		baseScore: num(o.baseScore, base.baseScore),
		ban: mergePunishment(base.ban, o.ban),
		mute: mergePunishment(base.mute, o.mute),
		report: {
			perReport: num(o.report?.perReport, base.report.perReport),
			maxPenalty: num(o.report?.maxPenalty, base.report.maxPenalty),
		},
		csrep: {
			ratingWeight: num(o.csrep?.ratingWeight, base.csrep.ratingWeight),
			bans: {
				vac: num(o.csrep?.bans?.vac, base.csrep.bans.vac),
				game: num(o.csrep?.bans?.game, base.csrep.bans.game),
				overwatch: num(o.csrep?.bans?.overwatch, base.csrep.bans.overwatch),
				faceit: num(o.csrep?.bans?.faceit, base.csrep.bans.faceit),
				economy: num(o.csrep?.bans?.economy, base.csrep.bans.economy),
			},
		},
		levels: {
			trusted: num(o.levels?.trusted, base.levels.trusted),
			neutral: num(o.levels?.neutral, base.levels.neutral),
			caution: num(o.levels?.caution, base.levels.caution),
		},
	}
}
