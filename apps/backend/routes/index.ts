import Elysia from 'elysia'

// Routes
import CommunitiesRoutes from './communities'
import PlayersRoutes from './players'

const routes = new Elysia()
	.group('/players', app => app.use(PlayersRoutes))
	.group('/communities', app => app.use(CommunitiesRoutes))

export default routes
