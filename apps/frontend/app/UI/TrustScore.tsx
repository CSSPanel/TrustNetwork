'use client'

import { Badge, RingProgress, Tooltip } from '@mantine/core'
import { BsInfoCircle } from 'react-icons/bs'
import type { TrustScore as TTrustScore, TrustLevel } from '@/utils/types'

const LEVELS: Record<TrustLevel, { color: string; label: string }> = {
	trusted: { color: 'teal', label: 'Trusted' },
	neutral: { color: 'indigo', label: 'Neutral' },
	caution: { color: 'yellow', label: 'Caution' },
	risky: { color: 'red', label: 'Risky' },
}

/** The score ring + level, with an expandable, transparent breakdown of the math. */
const TrustScore = ({ trust }: { trust: TTrustScore }) => {
	const lvl = LEVELS[trust.level]
	const calc = trust.calculation

	return (
		<div className="flex flex-col gap-3 min-w-[260px]">
			<div className="flex items-center gap-4">
				<RingProgress
					size={108}
					thickness={9}
					roundCaps
					sections={[{ value: trust.score, color: lvl.color }]}
					label={
						<div className="text-center leading-none">
							<div className="text-2xl font-bold">{trust.score}</div>
							<div className="text-[10px] text-gray-500 mt-0.5">/ 100</div>
						</div>
					}
				/>
				<div className="flex flex-col gap-1.5">
					<Badge color={lvl.color} size="lg" variant="light" radius="sm">
						{lvl.label}
					</Badge>
					<span className="text-xs text-gray-400 max-w-[150px]">
						From {calc.communitiesQueried} communit{calc.communitiesQueried === 1 ? 'y' : 'ies'}
						{calc.csrep.applied ? ' + csrep' : ''}.
					</span>
					{trust.provisional && (
						<Tooltip label="Placeholder model — the weights are still being tuned." withArrow multiline w={220}>
							<span className="flex items-center gap-1 text-[11px] text-gray-500 cursor-help w-fit">
								<BsInfoCircle size={11} /> Provisional score
							</span>
						</Tooltip>
					)}
				</div>
			</div>

			<details className="group">
				<summary className="cursor-pointer text-xs text-indigo-300 hover:text-indigo-200 select-none">
					How this score was calculated
				</summary>
				<div className="mt-2 flex flex-col gap-1 text-xs bg-black/30 border border-white/10 rounded-lg p-3">
					<Row label="Base score" value={`${calc.base}`} />
					{calc.factors.map(f => (
						<Row
							key={f.key}
							label={`${f.label} ×${f.count}${f.capped ? ' (capped)' : ''}`}
							value={`−${f.penalty}`}
							negative
						/>
					))}
					{calc.factors.length === 0 && (
						<span className="text-gray-500">No punishments on record.</span>
					)}
					{calc.csrep.applied && (
						<Row
							label={`csrep blend (rating ${calc.csrep.rating}, ${Math.round(calc.csrep.weight * 100)}%)`}
							value={`${Math.round(calc.csrep.scoreBeforeBlend)} → ${Math.round(calc.csrep.scoreAfterBlend)}`}
						/>
					)}
					<div className="border-t border-white/10 mt-1 pt-1">
						<Row label="Final score" value={`${calc.finalScore}`} strong />
					</div>
				</div>
			</details>
		</div>
	)
}

const Row = ({
	label,
	value,
	negative,
	strong,
}: {
	label: string
	value: string
	negative?: boolean
	strong?: boolean
}) => (
	<div className="flex items-center justify-between gap-4">
		<span className={strong ? 'font-semibold text-gray-200' : 'text-gray-400'}>{label}</span>
		<span
			className={`tabular-nums ${negative ? 'text-red-300' : strong ? 'font-semibold text-gray-100' : 'text-gray-300'}`}
		>
			{value}
		</span>
	</div>
)

export default TrustScore
