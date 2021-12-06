import {checkCache, writeToCache} from "./lib/http-cache-helper.js"

export async function getPastStream() {
    let pastStream 
    if (process.env.USE_DUMMY_DATA === "true") {
        pastStream = await pollPaststreamStatusDummy(process.env.WATCH_CHANNEL_ID)
    } else {
        pastStream = await pollPaststreamStatus(process.env.WATCH_CHANNEL_ID)
    }
    
    return pastStream
}

function createPollRoute(channelID) {
    return `https://holodex.net/api/v2/channels/${channelID}/videos?lang=en&type=stream%2Cplaceholder&include=live_info&limit=24&offset=0&paginated=true`
}

export async function fetchPaststreamPage(channelID) {
    const PASTSTREAM_CACHE = "/tmp/past-streams.json"

    // TODO: Write livestream data to a temp file and check if it exists
    // if it does use a low TTL otherwise use a higher TTL (default of 15 minutes)
    const {shouldInvalidateCache, cache} = await checkCache(PASTSTREAM_CACHE, 5)
    if (!shouldInvalidateCache) {
        console.info('paststream-poller: cache hit!');
        return {error: null, result: cache["result"]};
    }
    console.info('paststream-poller: cache miss!')

    try {
        const res = await fetch(createPollRoute(channelID))
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
        }
        const youtubeJSON = await res.json()
        writeToCache(PASTSTREAM_CACHE, youtubeJSON)
        return { error: null, result: youtubeJSON }
    } catch (e) {
        return { error: e.toString(), result: { items: [] } }
    }
}

export function extractPaststreamInfo(fromPageContent) {
    const lastStream = fromPageContent.items.filter(e => {
        return e.status === 'past' &&
            e.type === 'stream' &&
            e.topic_id !== 'shorts' &&
            e.duration >= 1800
    })[0]
    return lastStream
}

export async function pollPaststreamStatus(channelID) {
    const { error, result: youtubeJSON } = await fetchPaststreamPage(channelID)
    if (error) {
        return { error, result: null }
    }

    return extractPaststreamInfo(youtubeJSON)   
}

export async function pollPaststreamStatusDummy(unused) {
    const dummyData = require("./data.json")
    return extractPaststreamInfo(dummyData)
}
