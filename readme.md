# Trust Network

A cross-community trust/reputation network for CS2. One lookup returns a player's
**bans, mutes and reports gathered from every participating community**, merged with
their [csrep.gg](https://csrep.gg) profile and rolled into a single **trust score**.

It's built on top of [CSSPanel](https://csspanel.dev): every community running a
CSSPanel automatically exposes a small read-only endpoint, and the network simply
queries them all and stacks the results.

---

## What it gathers

For a given SteamID64, the network collects:

- **csrep profile** — Steam/FACEIT/Premier stats, VAC & game-ban flags, csrep's own trust rating.
- **Per community, from each CSSPanel:**
  - **Bans** — `reason`, `duration` (minutes, `0` = permanent), `status` (`ACTIVE` / `UNBANNED` / `EXPIRED`), `created`, `ends`.
  - **Mutes** — same as bans plus a `type` (`GAG` / `MUTE` / `SILENCE`).
  - **Reports** — how many reports the player has received on that community.

## How it works

1. **On boot**, the backend reads the community list (`config/communities.json`) and
   probes each panel once for its title + favicon (for nicer display).
2. **On every lookup** (`GET /players/:steamid`):
   - It fetches the player's **csrep** profile first.
   - Then it queries **every community panel in parallel** at
     `GET {panel}/api/users/{steamid}/punishments`.
   - Results are stacked under each community and a **trust score** is computed.
3. **Opt-out is automatic** — if a panel answers `403`/`404` (sharing disabled / no
   such route) it's dropped from the network for that runtime. Transient errors
   (timeouts, 5xx) are just skipped, never permanently removed.
4. **Caching** — each player's result is cached in Redis for ~12h. Append
   `?refresh=true` to force a fresh fetch.

### The trust score

A `0–100` score (`trusted` / `neutral` / `caution` / `risky`), derived from the
gathered punishments and blended with csrep's rating. **Permanent (duration `0`)
bans are treated as critical — a cheater-grade signal — and weigh far more than
temporary ones.** All weights live in `config/trust.json`, and every response ships
the exact `config` + a step-by-step `calculation` so the number is fully reproducible.

> The current model is **provisional** (`"provisional": true`) — the weights are
> still being tuned. Inputs are exposed verbatim so you can compute your own.

## The endpoint

```
GET /players/:steamid          # 17-digit SteamID64
GET /players/:steamid?refresh=true   # bypass the cache
```

```jsonc
{
  "steamid": "76561198869203626",
  "csrep": { "name": "...", "avatar": "...", "trust_rating": null, "bans": { "vac": false, ... } },
  "communities": {
    "bans.next-il.co.il": {
      "community": { "id": "bans.next-il.co.il", "url": "https://bans.next-il.co.il", "title": "CS2IL", "favicon": "..." },
      "steamid": "76561198869203626",
      "reports": 0,
      "bans":  [{ "reason": "cheating", "duration": 0, "status": "ACTIVE", "created": "...", "ends": null }],
      "mutes": []
    }
  },
  "trust": {
    "score": 25,
    "level": "risky",
    "config": { "...": "the weights used" },
    "calculation": { "base": 100, "factors": [ ... ], "csrep": { ... }, "finalScore": 25 },
    "provisional": true
  },
  "fetchedAt": "2026-06-26T19:05:55.948Z"
}
```

---

# Tutorial 1 — Self-host with your own selected communities

Run the whole stack yourself and point it at exactly the communities you choose.

### Prerequisites

- [Bun](https://bun.sh) `>= 1.1.12`
- A **Redis** instance (for the player cache)
- A **csrep.gg** API key — request one at [csrep.gg](https://csrep.gg)
- The community panels you want must be on **CSSPanel** (so they expose
  `/api/users/:steamid/punishments`)

### 1. Install

```bash
git clone <this-repo> && cd TrustRep
bun install
```

### 2. Pick your communities

Edit **`apps/backend/config/communities.json`** — an array of panel **base URLs**
(the panel homepage, not the API path). Scheme-less entries are upgraded to `https`.

```json
{
  "communities": [
    "https://bans.next-il.co.il",
    "https://bans.your-community.com"
  ]
}
```

That's the whole opt-in: any URL you add here is queried at
`{url}/api/users/{steamid}/punishments`. Remove a community to stop querying it.

### 3. Tune the trust model (optional)

Edit **`apps/backend/config/trust.json`**. Punishments are scored by **status**
(`active` / `past`) and **duration** (`permanent` = `duration 0`). csrep contributes
both its `trust_rating` (blended at `ratingWeight`) and flat penalties for its hard
ban flags.

```json
{
  "baseScore": 100,
  "ban":  { "active": { "permanent": 75, "temporary": 30 }, "past": { "temporary": 8 } },
  "mute": { "active": { "permanent": 20, "temporary": 6 },  "past": { "temporary": 1 } },
  "report": { "perReport": 2, "maxPenalty": 20 },
  "csrep":  { "ratingWeight": 0.3, "bans": { "vac": 40, "game": 35, "overwatch": 30, "faceit": 20, "economy": 5 } },
  "levels": { "trusted": 80, "neutral": 55, "caution": 30 }
}
```

> A **reversed permanent** punishment (`duration 0` but no longer `ACTIVE`, e.g.
> unbanned) is **ignored** — only *active* permanent bans count as critical.

Edits apply on restart, or instantly on any `?refresh=true` lookup. A partial file
merges onto the defaults; an invalid file falls back to the defaults.

### 4. Environment

**`apps/backend/.env`**

```ini
WEBSITE_URL = "http://localhost:3000"   # / redirect target (needs the protocol)
API_PORT = 5555

# csrep.gg
CSREP_KEY_ID = "..."
CSREP_SECRET = "..."

# Redis (player cache)
REDIS_HOST = "..."
REDIS_USER = "default"
REDIS_PASSWORD = "..."
REDIS_PORT = 6379

# Optional overrides
# COMMUNITIES_CONFIG = "/abs/path/communities.json"
# TRUST_CONFIG       = "/abs/path/trust.json"
```

**`apps/frontend/.env`**

```ini
WEBSITE_NAME = "Trust Network"
API = "http://localhost:5555"           # where the backend is reachable
```

### 5. Run

```bash
bun dev          # backend (:5555) + frontend (:3000) together
# or individually:
bun backend:dev
bun frontend:dev
```

Production:

```bash
bun run build
bun start
```

---

# Tutorial 2 — Use our hosted network

Don't want to host anything? Query the network we already run at
**`https://rep.csspanel.dev`**, backed by our member communities.

### Look up a player

```bash
curl https://rep.csspanel.dev/players/76561198869203626
```

```ts
const res = await fetch(`https://rep.csspanel.dev/players/${steamId}`)
const rep = await res.json()

console.log(rep.trust.score, rep.trust.level)   // e.g. 25 'risky'
```

You get back the full object shown [above](#the-endpoint): the csrep profile, every
community's bans/mutes/reports, and the trust score with its breakdown. Results are
cached ~12h; add `?refresh=true` to force a refresh.

### Use it on your CS2 server (plugin)

A turnkey **CounterStrikeSharp plugin** is on the way — drop it into your server and
it queries the network whenever a player connects, then acts on their trust score
(warn admins, flag, or block, your call). It's just a thin client over the API
above, so until it ships you can wire the same flow yourself:

```ts
// pseudo-code: on player connect
const rep = await fetch(`https://rep.csspanel.dev/players/${steamId}`).then(r => r.json())

if (rep.trust.level === 'risky') {
  notifyAdmins(`${rep.csrep?.name ?? steamId} — trust ${rep.trust.score}, ` +
    `${Object.keys(rep.communities).length} communities reporting`)
}
```

No API key is required to read the network. Be reasonable with request volume — the
network already caches, so let it.

### Add your community to the network

Running a community on **CSSPanel**? You're eligible automatically — your panel
already answers:

```
GET https://your-panel.com/api/users/{steamid}/punishments
→ { steamid, reports, bans, mutes }
```

Ask us to add your panel URL to the hosted network, and your bans/mutes/reports start
contributing to (and benefiting from) everyone's lookups. Turn sharing off any time
and we drop you automatically.

---

## Project layout

```
apps/
  backend/        Elysia + Bun API
    config/       communities.json · trust.json
    routes/       players
    utils/lib/    federation/ (registry, metadata, punishments, trust) · csrep · cache
  frontend/       Next.js + Mantine UI
packages/
  backend-api/    typed Eden client shared with the frontend
```

## Tech stack

**Backend:** Bun · Elysia · ioredis · csrep.gg · axios
**Frontend:** Next.js 14 · Mantine v7 · Tailwind · SWR
