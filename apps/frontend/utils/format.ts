/** Pull a 17-digit SteamID64 out of a raw id or a Steam profile URL. */
export function extractSteamId(input: string): string | null {
	const trimmed = input.trim()
	if (/^\d{17}$/.test(trimmed)) return trimmed
	const match = trimmed.match(/7656\d{13}/)
	return match ? match[0] : null
}

/** Minutes → compact human duration. 0 / negative means an infinite (permanent) punishment. */
export function formatDuration(minutes: number): string {
	if (!minutes || minutes <= 0) return 'Permanent'
	const d = Math.floor(minutes / 1440)
	const h = Math.floor((minutes % 1440) / 60)
	const m = minutes % 60
	return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || `${minutes}m`
}

export function formatDate(iso: string): string {
	const d = new Date(iso)
	return Number.isNaN(d.getTime())
		? '—'
		: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function timeAgo(iso: string): string {
	const then = new Date(iso).getTime()
	if (Number.isNaN(then)) return ''
	const sec = Math.round((Date.now() - then) / 1000)
	if (sec < 60) return 'just now'
	const min = Math.round(sec / 60)
	if (min < 60) return `${min}m ago`
	const hr = Math.round(min / 60)
	if (hr < 24) return `${hr}h ago`
	return `${Math.round(hr / 24)}d ago`
}

export const fmtNum = (n: number | null | undefined): string =>
	typeof n === 'number' ? n.toLocaleString() : '—'
