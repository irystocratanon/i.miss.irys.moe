import { parse } from "node-html-parser"
import {getDefaultRequestHeaders} from "./lib/http-request-helper.js"

import {CancelledStreams} from "./cancelled.js"

export const STREAM_STATUS = {
    OFFLINE: 1,
    INDETERMINATE: 2,
    STARTING_SOON: 3,
    LIVE: 4,
    JUST_ENDED: 5
}

function createPollRoute(channelID) {
    return `https://www.youtube.com/channel/${channelID}/live`
}

function validateVideoLink(anyLink) {
    if (anyLink.match(/watch\?v=/)) {
        return anyLink
    }
}

export async function fetchLivestreamPage(channelID) {
    try {
        const res = await fetch(createPollRoute(channelID), getDefaultRequestHeaders())
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
        }
        const youtubeHTML = await res.text()
        return { error: null, result: youtubeHTML }
    } catch (e) {
        console.warn(e)
        return { error: e.toString(), result: null }
    }
}

const VIDEO_INFO_EXPECT_START = "var ytInitialPlayerResponse = "
export function extractLivestreamInfo(fromPageContent) {
    const dom = parse(fromPageContent, {
        blockTextElements: {
            script: true,
            noscript: false,
            style: false,
            pre: false,
        }
    })

    const canonical = dom.querySelector("link[rel='canonical']")
    if (!canonical) {
        return { error: "Malformed HTML", result: null } 
    }

    const videoLink = validateVideoLink(canonical.getAttribute("href"))
    if (!videoLink) {
        return { error: null, result: { live: STREAM_STATUS.OFFLINE, title: null, videoLink: null, streamStartTime: null, channel: "IRyS Ch. hololive-EN" } }
    } 

    const liveTitle = dom.querySelector("meta[name='title']").getAttribute("content")
    const basicResponse = { error: null, result: { live: STREAM_STATUS.INDETERMINATE, title: liveTitle, videoLink, streamStartTime: null, channel: "IRyS Ch. hololive-EN" } }

    const scripts = dom.querySelectorAll("script")
    let playerInfo = null
    for (let i = 0; i < scripts.length; ++i) {
        const text = scripts[i].textContent
        
        if (text.startsWith(VIDEO_INFO_EXPECT_START)) {
            try {
                playerInfo = JSON.parse(text.substring(VIDEO_INFO_EXPECT_START.length, text.length - 1))
            } catch {
                continue
            }
            break
        }
    }

    try {
        if (basicResponse.result.title.indexOf('【FREE CHAT】') === 0 && basicResponse.result.live !== STREAM_STATUS.LIVE) {
            return { error: null, result: { live: STREAM_STATUS.OFFLINE, title: null, videoLink: null, streamStartTime: null, channel: "IRyS Ch. hololive-EN" } }
        }
    } catch (e) {
        console.error("livestream_poller::FREE_CHAT")
        console.error(e)
    }

    if (!playerInfo) {
        return basicResponse
    }

    // Check if stream frame is actually live, or just a waiting room
    const videoDetails = playerInfo.videoDetails

    if (videoDetails.hasOwnProperty('id')) {
        const cancelled = CancelledStreams.find(e => {
            return e === videoDetails.id
        })
        if (cancelled) {
            return { error: null, result: { live: STREAM_STATUS.OFFLINE, title: null, videoLink: null, streamStartTime: null, channel: "IRyS Ch. hololive-EN" } }
        }
    }

    if (videoDetails?.isLiveContent && videoDetails?.isUpcoming) {
        basicResponse.result.live = STREAM_STATUS.STARTING_SOON
    } else if (videoDetails?.isLiveContent && !videoDetails?.isUpcoming) {
        basicResponse.result.live = STREAM_STATUS.LIVE
    }

    basicResponse.result.channel = "IRyS Ch. hololive-EN"

    // Check stream frame start time
    // If it's more than one hour out, act as if it was offline
    const ts = playerInfo.playabilityStatus?.
        liveStreamability?.liveStreamabilityRenderer?.offlineSlate?.
        liveStreamOfflineSlateRenderer?.scheduledStartTime
    if (ts === undefined) {
        return basicResponse
    }

    const expectedStartTime = parseInt(ts) * 1000
    const waitTimeLeftMS = expectedStartTime - (new Date().getTime())
    basicResponse.result.streamStartTime = new Date(expectedStartTime)
    if (waitTimeLeftMS > 1800 * 1000) {
        basicResponse.result.live = STREAM_STATUS.OFFLINE
    }

    return basicResponse
}

export async function pollLivestreamStatus(channelID) {
    const { error, result: youtubeHTML } = await fetchLivestreamPage(channelID)
    if (error) {
        return { error, result: null }
    }

    return extractLivestreamInfo(youtubeHTML)   
}

export async function pollLivestreamStatusDummy(unused, selectMock) {
    const fakeResult = { 
        live: STREAM_STATUS.OFFLINE, 
        title: "Dummy dummy dummy dummy", 
        videoLink: "https://www.youtube.com/watch?v=aaaaaaaaaaa", 
        streamStartTime: new Date(Date.now() + 3600000)
    }
    switch (selectMock) {
        case "error": return { error: "Fake Error", result: null }
        case "nostream": return { error: null, result: { live: STREAM_STATUS.OFFLINE, title: null, videoLink: null, streamStartTime: null } }
        case "degraded":
            fakeResult.live = STREAM_STATUS.INDETERMINATE
            fakeResult.streamStartTime = null
            return { error: null, result: fakeResult }
        case "farout":
            fakeResult.live = STREAM_STATUS.OFFLINE
            return { error: null, result: fakeResult }
        case "soon":
            fakeResult.live = STREAM_STATUS.STARTING_SOON
            return { error: null, result: fakeResult }
        case "live":
        default:
            fakeResult.live = STREAM_STATUS.LIVE
            return { error: null, result: fakeResult }
    }   
}
