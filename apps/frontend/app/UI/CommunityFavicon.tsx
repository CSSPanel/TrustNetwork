'use client'

import { useState } from 'react'
import { BsPeopleFill } from 'react-icons/bs'
import type { Community } from '@/utils/types'

/** A community's favicon with a graceful fallback to a generic icon. */
const CommunityFavicon = ({
	community,
	size = 18,
}: {
	community: Pick<Community, 'favicon' | 'title'>
	size?: number
}) => {
	const [ok, setOk] = useState(true)

	if (community.favicon && ok) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={community.favicon}
				alt=""
				width={size}
				height={size}
				style={{ width: size, height: size }}
				className="rounded-sm shrink-0 object-contain"
				onError={() => setOk(false)}
			/>
		)
	}

	return <BsPeopleFill className="text-indigo-300 shrink-0" size={size - 2} />
}

export default CommunityFavicon
