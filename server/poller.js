import { STREAM_STATUS, pollLivestreamStatus, pollLivestreamStatusDummy } from "../server/livestream_poller"
import { getPastStream } from "../server/paststream_poller"
import { LIVESTREAM_CACHE, PASTSTREAM_CACHE } from "../server/constants"
import { pollCollabstreamStatus } from "../server/collabs_poller"
import { intervalToDuration, parseISO } from "date-fns"
import { writeLivestreamToCache } from "../server/lib/http-cache-helper"
import { unlink } from "fs"
import { performance } from "perf_hooks"

export default async function getResult() {
    let t0 = performance.now()
    let t1
    const rmCache = async function(f) {
        unlink(f, () => {})
    }

    let apiVal
	let pastStream
	let collabs
    if (process.env.USE_DUMMY_DATA === "true") {
        apiVal = await pollLivestreamStatusDummy(process.env.WATCH_CHANNEL_ID, query.mock)
    } else {
        apiVal = await pollLivestreamStatus(process.env.WATCH_CHANNEL_ID)
        t1 = performance.now()
        console.debug(`[getResult pollLivestreamStatus] ${t1-t0}`);
        t0 = performance.now()
	}

    let { result, error } = apiVal

    if (result.live !== STREAM_STATUS.LIVE) {
        try {
            collabs = await pollCollabstreamStatus(process.env.WATCH_CHANNEL_ID)
            t1 = performance.now()
            console.debug(`[getResult pollCollabstreamStatus] ${t1-t0}`);
            t0 = performance.now()
            if (collabs.error !== null && collabs.error !== undefined) {
                collabs = null
            }
        } catch(e) { collabs = null }
        try {
            pastStream = (collabs?.status === 'live') ? null : await getPastStream()
            if (collabs.status !== 'live') {
                t1 = performance.now()
                console.debug(`[getResult getPastStream] ${t1-t0}`);
            }
            if (pastStream.error !== null && pastStream.error !== undefined) {
                pastStream = null
            }
        } catch (e) { pastStream = null }
        if (pastStream === null && collabs === null) {
            return {error, result, pastStream}
        }
        if (pastStream?.status !== 'live' && pastStream?.status !== 'just-ended') {
            switch (collabs.status) {
                case 'upcoming':
                case 'live':
                    const collabStart = parseISO(collabs.start_scheduled)
		    		const streamEarlierThanCollab = (result.streamStartTime !== null) ? ((result.streamStartTime < collabStart || (result.streamStartTime instanceof Date && collabStart instanceof Date && result.streamStartTime.getTime() === collabStart.getTime()))) : false
                    if (streamEarlierThanCollab) {
                        break
                    }
                    let collabStatus = (collabs.status === 'upcoming') ? STREAM_STATUS.INDETERMINATE : STREAM_STATUS.LIVE
                    const timeLeft = intervalToDuration({start: Date.now(), end: collabStart})
                    collabStatus = (timeLeft.hours < 1 && (Date.now() < collabStart)) ? STREAM_STATUS.STARTING_SOON : collabStatus
                    result = {
                        live: collabStatus,
                        title: collabs.title,
                        videoLink: `https://www.youtube.com/watch?v=${collabs.id}`,
                        id: collabs.id,
                        streamStartTime: collabStart
                    }
                    if (collabs.status === 'live') {
                        writeLivestreamToCache(result)
                    }
                    break;
                case 'past':
                    const collabEnd = parseISO(collabs.end_actual)
                    const pastStreamEnd = parseISO(pastStream.end_actual)
                    if (collabEnd > pastStreamEnd) {
                        pastStream = collabs
                    }
                    break;
                default:
                    break;
            }
        } else {
            result.live = STREAM_STATUS.JUST_ENDED
            result.title = String(pastStream?.title)
            result.videoLink = (pastStream?.videoLink) ? String(pastStream.videoLink) : `https://www.youtube.com/watch?v=${pastStream.id}`
            result.streamStartTime = (pastStream?.end_actual) ? parseISO(pastStream.end_actual) : null
            pastStream = null
            rmCache(PASTSTREAM_CACHE)
        }
    } else {
        writeLivestreamToCache(result)
    }

    if (result.live !== STREAM_STATUS.LIVE && result.live !== STREAM_STATUS.JUST_ENDED) {
        rmCache(LIVESTREAM_CACHE)
    }

    return {error, result, pastStream}
}
