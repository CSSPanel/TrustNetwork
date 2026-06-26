'use client'

import { Avatar, Badge, Button } from '@mantine/core'
import { AiOutlineReload } from 'react-icons/ai'
import { BsBoxArrowUpRight, BsMicMute, BsSlashCircle } from 'react-icons/bs'
import { FaSteam } from 'react-icons/fa'
import { fmtNum, formatDate, formatDuration, timeAgo } from '@/utils/format'
import type {
	CommunityPunishments,
	FederationBan,
	FederationMute,
	PlayerReputation,
} from '@/utils/types'
import CommunityFavicon from './CommunityFavicon'
import TrustScore from './TrustScore'

type Props = {
	data: PlayerReputation
	onRefresh: () => void
	refreshing: boolean
}

const PlayerReport = ({ data, onRefresh, refreshing }: Props) => {
	const csrep = data.csrep
	const csBans = (csrep?.bans ?? {}) as Record<string, unknown>
	const communities = Object.values(data.communities)

	return (
		<div className="flex flex-col gap-5">
			{/* Identity + trust score */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/5 border border-white/10 rounded-xl p-5">
				<div className="flex items-center gap-4 min-w-0">
					<Avatar src={csrep?.avatar} size={68} radius="md" alt={csrep?.name ?? data.steamid}>
						{(csrep?.name ?? '?').slice(0, 2).toUpperCase()}
					</Avatar>
					<div className="flex flex-col gap-1.5 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-xl font-semibold truncate">{csrep?.name || 'Unknown player'}</h3>
							{csBans.vac === true && (
								<Badge color="red" size="xs" variant="filled">
									VAC
								</Badge>
							)}
							{csBans.game === true && (
								<Badge color="red" size="xs" variant="filled">
									Game ban
								</Badge>
							)}
						</div>
						<code className="text-xs text-gray-400">{data.steamid}</code>
						<div className="flex items-center gap-3 mt-1 text-xs">
							<a
								href={`https://steamcommunity.com/profiles/${data.steamid}`}
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-1 text-gray-300 hover:text-white"
							>
								<FaSteam /> Steam <BsBoxArrowUpRight size={9} />
							</a>
							{csrep?.faceit_url && (
								<a
									href={csrep.faceit_url.replace('{lang}', 'en')}
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-1 text-gray-300 hover:text-white"
								>
									FACEIT <BsBoxArrowUpRight size={9} />
								</a>
							)}
						</div>
					</div>
				</div>
				<TrustScore trust={data.trust} />
			</div>

			{/* csrep stat chips */}
			{csrep && (
				<div className="flex flex-wrap gap-2">
					<Stat label="CS2 hours" value={fmtNum(csrep.cs2_hours)} />
					<Stat label="Steam level" value={fmtNum(csrep.steam_level)} />
					<Stat
						label="FACEIT"
						value={
							csrep.faceit_level
								? `lvl ${csrep.faceit_level}${csrep.faceit_elo ? ` · ${csrep.faceit_elo} elo` : ''}`
								: '—'
						}
					/>
					<Stat label="Premier" value={fmtNum(csrep.premier_elo)} />
					<Stat label="csrep trust" value={csrep.trust_rating != null ? `${csrep.trust_rating}` : '—'} />
				</div>
			)}

			{/* Punishments per community */}
			<div className="flex items-center justify-between gap-3">
				<h3 className="text-lg font-semibold">Punishments across the network</h3>
				<Button
					variant="subtle"
					color="gray"
					size="xs"
					leftSection={<AiOutlineReload />}
					onClick={onRefresh}
					loading={refreshing}
				>
					Refresh
				</Button>
			</div>

			{communities.length === 0 ? (
				<div className="text-center text-gray-400 text-sm bg-black/20 border border-white/10 rounded-xl p-8">
					No federated community reported on this player — either they're clean across the network, or the
					panels are currently offline.
				</div>
			) : (
				communities.map(c => <CommunityCard key={c.community.id} c={c} />)
			)}

			<p className="text-xs text-gray-500">
				Data fetched {timeAgo(data.fetchedAt)} · cached up to 12h · hit Refresh to force an update.
			</p>
		</div>
	)
}

const CommunityCard = ({ c }: { c: CommunityPunishments }) => {
	const empty = c.bans.length === 0 && c.mutes.length === 0

	return (
		<div className="bg-black/30 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<a
					href={c.community.url}
					target="_blank"
					rel="noreferrer"
					className="flex items-center gap-2.5 font-semibold hover:text-indigo-200"
				>
					<CommunityFavicon community={c.community} />
					{c.community.title}
					<BsBoxArrowUpRight size={11} className="text-gray-500" />
				</a>
				<div className="flex items-center gap-1.5">
					<Badge color="red" variant="light" size="sm">
						{c.bans.length} bans
					</Badge>
					<Badge color="orange" variant="light" size="sm">
						{c.mutes.length} mutes
					</Badge>
					<Badge color="gray" variant="light" size="sm">
						{c.reports} reports
					</Badge>
				</div>
			</div>

			{empty ? (
				<p className="text-sm text-gray-500">No bans or mutes on record.</p>
			) : (
				<div className="flex flex-col">
					{c.bans.map((b, i) => (
						<PunishmentRow key={`b${i}`} kind="ban" p={b} />
					))}
					{c.mutes.map((m, i) => (
						<PunishmentRow key={`m${i}`} kind="mute" p={m} />
					))}
				</div>
			)}
		</div>
	)
}

const STATUS_COLOR: Record<string, string> = {
	ACTIVE: 'red',
	EXPIRED: 'gray',
	UNBANNED: 'teal',
	UNMUTED: 'teal',
}

const PunishmentRow = ({ kind, p }: { kind: 'ban' | 'mute'; p: FederationBan | FederationMute }) => {
	const permanent = p.duration <= 0 || p.ends === null
	const muteType = kind === 'mute' ? (p as FederationMute).type : null

	return (
		<div className="flex items-start justify-between gap-3 py-2 border-t border-white/5 first:border-t-0">
			<div className="flex flex-col gap-1 min-w-0">
				<div className="flex items-center gap-1.5 flex-wrap">
					<Badge
						size="xs"
						variant="light"
						color={kind === 'ban' ? 'red' : 'orange'}
						leftSection={kind === 'ban' ? <BsSlashCircle size={9} /> : <BsMicMute size={9} />}
					>
						{kind === 'ban' ? 'Ban' : muteType}
					</Badge>
					<Badge size="xs" variant="outline" color={STATUS_COLOR[p.status] ?? 'gray'}>
						{p.status}
					</Badge>
					{permanent && (
						<Badge size="xs" variant="filled" color="red">
							Permanent
						</Badge>
					)}
				</div>
				<span dir="auto" className="text-sm text-gray-200 break-words">
					{p.reason || 'No reason given'}
				</span>
			</div>
			<div className="text-right text-[11px] text-gray-500 shrink-0">
				<div className={permanent ? 'text-red-300' : ''}>{formatDuration(p.duration)}</div>
				<div>{formatDate(p.created)}</div>
			</div>
		</div>
	)
}

const Stat = ({ label, value }: { label: string; value: string }) => (
	<div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
		<span className="text-xs text-gray-400">{label}</span>
		<span className="text-sm font-semibold tabular-nums">{value}</span>
	</div>
)

export default PlayerReport
