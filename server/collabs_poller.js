import {checkCache, writeToCache} from "./lib/http-cache-helper.js"

function createPollRoute(channelID) {
	//return `http://localhost:8000/data.json`
	return `https://holodex.net/api/v2/channels/${channelID}/collabs?lang=en&type=stream%2Cplaceholder&include=live_info&limit=24&offset=0&paginated=true`
}

export async function fetchCollabstreamPage(channelID) {
    const COLLABS_CACHE = "/tmp/collabs.json"

    const {shouldInvalidateCache, cache} = await checkCache(COLLABS_CACHE)
    if (!shouldInvalidateCache) {
        console.info('collabs-poller: cache hit!');
        return {error: null, result: cache["result"]};
    }
	console.info('collabs-poller: cache miss!')
    try {
        const res = await fetch(createPollRoute(channelID))
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
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
            ((e.status === 'upcoming' || e.status === 'live') || e.duration >= 1800)
    })[0]
    return collabs
}

export async function pollCollabstreamStatus(channelID) {
    const { error, result: youtubeJSON } = await fetchCollabstreamPage(channelID)
    if (error) {
        return { error, result: null }
    }

    return extractCollabstreamInfo(youtubeJSON)   
}
