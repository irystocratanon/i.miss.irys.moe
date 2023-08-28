import {checkCache, writeToCache} from "./lib/http-cache-helper.js"
import {getDefaultHoloDexRequestHeaders} from "./lib/http-request-helper.js"

import {CancelledStreams} from "./cancelled.js"
import {OptimalPOV} from "./optimal-pov.js"
import {COLLABS_CACHE} from "./constants"

function createPollRoute(channelID) {
	//return `http://localhost:8000/data.json`
	return `https://holodex.net/api/v2/channels/${channelID}/collabs?lang=en&type=stream%2Cplaceholder&include=live_info&limit=24&offset=0&paginated=true`
}

export async function fetchCollabstreamPage(channelID) {
    const {shouldInvalidateCache, cache} = await checkCache(COLLABS_CACHE)
    if (!shouldInvalidateCache) {
        console.info('collabs-poller: cache hit!');
        return {error: null, result: cache["result"]};
    }
    console.info('collabs-poller: cache miss!')

    const controller = new AbortController()
    let abortTimeout
    try {
        abortTimeout = setTimeout(() => { controller.abort(); }, 1250)
        const res = await fetch(createPollRoute(channelID), getDefaultHoloDexRequestHeaders({signal: controller.signal}))
        clearTimeout(abortTimeout)
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: { items: [] }}
        }
		const youtubeJSON = await res.json()
        writeToCache(COLLABS_CACHE, youtubeJSON)
        return { error: null, result: youtubeJSON }
    } catch (e) {
        return { error: e.toString(), result: { items: [] } }
    }
}

export function extractCollabstreamInfo(fromPageContent) {
    const collabs = fromPageContent.items.filter(e => {
        return e.type === 'stream' &&
            e.topic_id !== 'shorts' &&
            CancelledStreams.indexOf(e.id) < 0 &&
            (OptimalPOV.indexOf(e.id) < 0 || e.status === 'live') &&
            ((e.status === 'upcoming' || e.status === 'live') || e.duration >= 1800)
    })
    const liveCollabs = collabs.filter(e => {
        return e.status === 'live'
    })
    if (liveCollabs.length === 0) {
        let possible_collabs = []
        let start = collabs.findIndex(e => e.status == 'upcoming')
        start = (start < 0) ? 0 : start
        let end = collabs.findIndex(e => e.status != 'upcoming')
        end = (end < 0) ? collabs.length : end
        end = (start == end) ? ((collabs.length > end + 1) ? end + 1 : end) : end
        for (let i = start; i < end; i++) {
            possible_collabs.push(collabs[i])
        }
        possible_collabs = possible_collabs.sort((a,b) => { return new Date(a.start_scheduled) > new Date(b.start_scheduled) ? 1 : -1 });
        return possible_collabs[0];
    } else {
        return liveCollabs[Math.floor(Math.random()*liveCollabs.length)]
    }
}

export async function pollCollabstreamStatus(channelID) {
    const { error, result: youtubeJSON } = await fetchCollabstreamPage(channelID)
    if (error) {
        return { error, result: null }
    }

    return extractCollabstreamInfo(youtubeJSON)   
}
