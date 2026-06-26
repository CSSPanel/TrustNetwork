import { Elysia, redirect } from 'elysia'
import { Logestic } from 'logestic'
import compression from 'elysia-compress'
// import jtwSetup from './utils/lib/jwt'  // removed in the trust-network rewrite
// import swagger from './utils/swagger'
import cors from '@elysiajs/cors'

import routes from './routes'
import { initFederation } from './utils/lib/federation'

// Tasks
import heartbeatTask from './tasks/heartbeat'

// App
const app = new Elysia()
	// .use(Logestic.preset('fancy'))
	// .use(swagger)
	// .use(compression())
	.use(
		cors({
			origin: true,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	.use(routes)
	// .get('/', () => redirect('/docs'))
	.get('/', () => redirect(Bun.env.WEBSITE_URL || 'http://localhost:3000'))
	.listen(Bun.env.API_PORT || 6000, () => {
		console.log(`🦊 Server is running on port ${Bun.env.API_PORT || 6000}`)
	})

// Probe the federated community panels for their title/favicon (best-effort,
// non-blocking — the server is already accepting requests by now).
initFederation().catch(err => console.error('[federation] init failed:', err))

if (Bun.env.NODE_ENV === 'production') {
	// Tasks
	app.use(heartbeatTask)
}

export type App = typeof app
