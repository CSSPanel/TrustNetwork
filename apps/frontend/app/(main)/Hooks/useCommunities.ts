import useSWR from 'swr'
import { getCommunities } from '@/utils/api'

/** The federated communities, for the landing-page counter and network list. */
const useCommunities = () =>
	useSWR('communities', getCommunities, {
		keepPreviousData: true,
		revalidateOnFocus: false,
	})

export default useCommunities
