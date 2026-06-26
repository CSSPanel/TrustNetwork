import Elysia from 'elysia'
import { getCommunities } from '../../utils/lib/federation'

const CommunitiesRoutes = new Elysia({
	detail: {
		tags: ['Communities'],
	},
}).get('/', () => getCommunities(), {
	detail: {
		summary: 'List the active, sharing-enabled federated communities (id, url, title, favicon)',
	},
})

export default CommunitiesRoutes
