import "abortcontroller-polyfill/dist/polyfill-patch-fetch"
import {checkCache, readLivestreamFromCache, writeToCache} from "./lib/http-cache-helper.js"
import {getDefaultRequestHeaders} from "./lib/http-request-helper.js"
import {CancelledStreams} from "./cancelled.js"
import {OptimalPOV} from "./optimal-pov.js"

import {parseISO} from 'date-fns'

import {PASTSTREAM_CACHE} from "./constants"

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

const isPastStream = e => {
    return e.status === 'past' &&
           e.type === 'stream' &&
           e.topic_id !== 'shorts' &&
           (CancelledStreams.indexOf(e.id) < 0 || e.status === 'live') &&
           (OptimalPOV.indexOf(e.id) < 0 || e.status === 'live') &&
           e.duration >= 1800 || (e.duration === 0 && e.status === 'live')
}

export async function fetchPaststreamPage(channelID) {
    let {shouldInvalidateCache, cache} = await checkCache(PASTSTREAM_CACHE)
    let liveStreamCache, lastSeenLiveStream, pastStreamDate
    try {
        liveStreamCache = await readLivestreamFromCache()
        lastSeenLiveStream = (liveStreamCache !== null) ? new Date(liveStreamCache['lastSeen']) : new Date(0)
        if (cache !== null) {
            pastStreamDate = parseISO(cache.result.items.find(isPastStream).end_actual);
            if (pastStreamDate.getTime() < lastSeenLiveStream) {
                shouldInvalidateCache = true
            }
        }
    } catch(e) {}
    if (!shouldInvalidateCache) {
        console.info('paststream-poller: cache hit!');
        return {error: null, result: cache["result"]};
    }
    console.info('paststream-poller: cache miss!')

    const controller = new AbortController()
    let abortTimeout
    try {
        abortTimeout = setTimeout(() => controller.abort, 2500)
        const res = await fetch(createPollRoute(channelID), getDefaultRequestHeaders({signal: controller.signal}))
        clearInterval(abortTimeout)
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
        }
        let youtubeJSON = await res.json()
        writeToCache(PASTSTREAM_CACHE, youtubeJSON)
        if (liveStreamCache !== null) {
            try {
                pastStreamDate = parseISO(youtubeJSON.items.find(isPastStream).end_actual);
                if (pastStreamDate.getTime() < lastSeenLiveStream) {
                    youtubeJSON = {
                        items: [
                            {
                                title: liveStreamCache.title,
                                videoLink: liveStreamCache.videoLink,
                                status: "just-ended",
                                end_actual: lastSeenLiveStream.toISOString()
                            }
                        ]
                    }
                    return { error: null, result: youtubeJSON }
                }
            } catch (e) {}
        }
        return { error: null, result: youtubeJSON }
    } catch (e) {
        return { error: e.toString(), result: { items: [] } }
    }
}

export function extractPaststreamInfo(fromPageContent) {
    const lastStream = fromPageContent.items.find(e => {
        return isPastStream(e) || e.status === 'just-ended'
    })
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
