'use client'

import { useState } from 'react'
import { Badge, Button, CopyButton, Loader, Table, TextInput, Tooltip } from '@mantine/core'
import { ActionIcon } from '@mantine/core'
import { BsBoxArrowUpRight, BsCheck2, BsClipboard, BsPeopleFill, BsSearch } from 'react-icons/bs'
import useSWR from 'swr'
import { getPlayer } from '@/utils/api'
import { extractSteamId } from '@/utils/format'
import CommunityFavicon from '@/app/UI/CommunityFavicon'
import PlayerReport from '@/app/UI/PlayerReport'
import useCommunities from '../Hooks/useCommunities'

const API = (process.env.API || '').replace(/\/$/, '')
const EXAMPLE_ID = '76561198869203626'

const Home = () => {
	const { data: communities } = useCommunities()

	const [input, setInput] = useState('')
	const [submitted, setSubmitted] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)

	const { data, error, isLoading, mutate } = useSWR(
		submitted ? ['player', submitted] : null,
		() => getPlayer(submitted as string),
		{ revalidateOnFocus: false, shouldRetryOnError: false },
	)

	const parsedId = extractSteamId(input)
	const invalid = input.trim().length > 0 && !parsedId

	const lookup = (raw: string) => {
		const id = extractSteamId(raw)
		if (id) setSubmitted(id)
	}

	const onRefresh = async () => {
		if (!submitted) return
		setRefreshing(true)
		try {
			const fresh = await getPlayer(submitted, true)
			await mutate(fresh, { revalidate: false })
		} finally {
			setRefreshing(false)
		}
	}

	return (
		<div className="flex flex-col gap-6 w-full my-20">
			{/* Hero */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-3">
					<Badge color="indigo" variant="light" size="lg" radius="sm">
						Cross-community trust network
					</Badge>
					<h1 className="text-3xl md:text-4xl font-bold leading-tight">
						One reputation, shared across every community
					</h1>
					<p className="text-gray-300 max-w-2xl">
						Trust Network pulls a player's bans, mutes and reports from every CSSPanel community in the network — plus
						their{' '}
						<a href="https://csrep.gg" target="_blank" rel="noreferrer" className="text-pink-300 hover:underline">
							csrep
						</a>{' '}
						profile — and rolls it into a single trust score. Look up any Steam account below.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-1 border border-white/10">
						<BsPeopleFill className="text-indigo-300" />
						<span className="font-semibold text-lg tabular-nums">
							{communities ? communities.length : <Loader size="xs" />}
						</span>
						<span className="text-gray-400 text-sm">communities in the network</span>
					</div>
				</div>
			</section>

			{/* Player lookup */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Look up a player</h2>
					<p className="text-gray-400 text-sm">Paste a SteamID64 or a Steam profile URL.</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
					<TextInput
						placeholder="76561198…  or  steamcommunity.com/profiles/…"
						value={input}
						onChange={e => setInput(e.currentTarget.value)}
						onKeyDown={e => e.key === 'Enter' && lookup(input)}
						error={invalid ? 'Enter a 17-digit SteamID64 or a profile URL' : undefined}
						size="md"
					/>
					<Button
						size="md"
						color="indigo"
						leftSection={<BsSearch />}
						onClick={() => lookup(input)}
						disabled={!parsedId}
						loading={isLoading}
					>
						Look up
					</Button>
				</div>

				<div className="flex items-center gap-2 text-xs">
					<span className="text-gray-500">Try:</span>
					<button
						type="button"
						onClick={() => {
							setInput(EXAMPLE_ID)
							lookup(EXAMPLE_ID)
						}}
						className="rounded-full px-3 py-1 border border-white/10 bg-white/5 text-gray-300 hover:border-white/30 duration-200"
					>
						{EXAMPLE_ID}
					</button>
				</div>

				{error && (
					<div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
						{(error as Error).message}
					</div>
				)}
				{isLoading && (
					<div className="flex justify-center py-10">
						<Loader />
					</div>
				)}
				{data && !isLoading && <PlayerReport data={data} onRefresh={onRefresh} refreshing={refreshing} />}
			</section>

			{/* How it works */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">How it works</h2>
					<p className="text-gray-400 text-sm">Every lookup runs the same three steps.</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Step
						n="1"
						title="Query the network"
						desc="We fetch the player's csrep profile, then ask every community panel for their punishments in parallel."
					/>
					<Step
						n="2"
						title="Aggregate"
						desc="Bans, mutes and report counts from each community are stacked together — nothing is hidden or merged away."
					/>
					<Step
						n="3"
						title="Score"
						desc="A trust score is derived from the result. Permanent (infinite) bans weigh heaviest — they're treated as a cheater-grade signal."
					/>
				</div>
			</section>

			{/* Communities in the network */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Communities in the network</h2>
					<p className="text-gray-400 text-sm">Panels currently sharing punishment data.</p>
				</div>

				{!communities ? (
					<div className="flex justify-center py-6">
						<Loader size="sm" />
					</div>
				) : communities.length === 0 ? (
					<p className="text-gray-500 text-sm">No communities registered yet.</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{communities.map(c => (
							<a
								key={c.id}
								href={c.url}
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:border-white/30 duration-200"
							>
								<CommunityFavicon community={c} size={22} />
								<div className="flex flex-col min-w-0">
									<span className="font-medium truncate">{c.title}</span>
									<span className="text-xs text-gray-500 truncate">
										{c.url.replace(/^https?:\/\//, '')}
									</span>
								</div>
								<BsBoxArrowUpRight className="ml-auto text-gray-500 shrink-0" size={12} />
							</a>
						))}
					</div>
				)}
			</section>

			{/* For community owners + reference */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Run a community? You're already in</h2>
					<p className="text-gray-400 text-sm">
						Every community on CSSPanel exposes the shared endpoint automatically — your panel just answers:
					</p>
				</div>

				<CodeBlock code={'GET  https://your-panel.com/api/users/{steamid}/punishments'} />

				<p className="text-gray-400 text-sm">
					It returns <code className="text-emerald-300">{'{ steamid, reports, bans, mutes }'}</code>. Disable
					sharing and we drop you from the network automatically. Trust Network then exposes:
				</p>

				<div className="overflow-x-auto">
					<Table withColumnBorders verticalSpacing="sm" striped>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Endpoint</Table.Th>
								<Table.Th>Returns</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							<Table.Tr>
								<Table.Td>
									<code className="text-emerald-300">GET</code>{' '}
									<code className="text-gray-200">{`${API}/players/{steamid}`}</code>
								</Table.Td>
								<Table.Td className="text-gray-300">
									csrep profile + punishments from every community + a trust score.{' '}
									<code className="text-pink-300">?refresh=true</code> bypasses the cache.
								</Table.Td>
							</Table.Tr>
						</Table.Tbody>
					</Table>
				</div>
			</section>

			{/* CTA footer */}
			<section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border border-white/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Check before you trust</h2>
					<p className="text-gray-300 text-sm">
						One lookup shows a player's standing across the whole network.
					</p>
				</div>
				<Button
					size="md"
					color="indigo"
					leftSection={<BsSearch size={16} />}
					onClick={() => {
						setInput(EXAMPLE_ID)
						lookup(EXAMPLE_ID)
						window.scrollTo({ top: 0, behavior: 'smooth' })
					}}
				>
					Try a lookup
				</Button>
			</section>
		</div>
	)
}

/** A numbered step in the "How it works" grid. */
const Step = ({ n, title, desc }: { n: string; title: string; desc: string }) => (
	<div className="flex flex-col gap-2 bg-white/5 border border-white/10 rounded-xl p-5">
		<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-200 font-bold text-sm">
			{n}
		</div>
		<h3 className="font-semibold">{title}</h3>
		<p className="text-sm text-gray-400">{desc}</p>
	</div>
)

/** A code snippet with a copy button in the corner. */
const CodeBlock = ({ code }: { code: string }) => (
	<div className="relative group">
		<pre className="overflow-x-auto bg-black/40 border border-white/10 rounded-lg p-4 text-sm text-gray-200">
			<code>{code}</code>
		</pre>
		<div className="absolute top-2 right-2">
			<CopyButton value={code} timeout={1500}>
				{({ copied, copy }) => (
					<Tooltip label={copied ? 'Copied!' : 'Copy'} withArrow>
						<ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
							{copied ? <BsCheck2 size={16} /> : <BsClipboard size={14} />}
						</ActionIcon>
					</Tooltip>
				)}
			</CopyButton>
		</div>
	</div>
)

export default Home
