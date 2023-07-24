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
    //channelID = 'UC6eWCld0KwmyHFbAqK3V-Rw'
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
const INITIAL_DATA_EXPECT_START = "var ytInitialData = "
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
    //console.log('videoLink: ', videoLink);
    if (!videoLink) {
        if (canonical.getAttribute("href").endsWith(`/channel/${process.env.WATCH_CHANNEL_ID}`)) {
            try {
                const scripts = dom.querySelectorAll("script")
                let playerInfo = null
                for (let i = 0; i < scripts.length; ++i) {
                    const text = scripts[i].textContent

                    if (text.startsWith(INITIAL_DATA_EXPECT_START)) {
                        try {
                            playerInfo = JSON.parse(text.substring(INITIAL_DATA_EXPECT_START.length, text.length - 1))
                        } catch {
                            continue
                        }
                        break
                    }
                }
                const grid = playerInfo.contents.twoColumnBrowseResultsRenderer.tabs.find(e => { return e.tabRenderer.title === 'Live'; })
                //console.log('grid: ', grid)
                let contents = grid.tabRenderer.content.richGridRenderer.contents
                contents = contents.filter(e => {
                    let is_live = false
                    if (e.richItemRenderer) {
                        try {
                        let thumbnailOverlays = e.richItemRenderer.content.videoRenderer.thumbnailOverlays
                        let thumbnailOverlayTimeStatusRenderer = thumbnailOverlays.find(e => Object.hasOwn(e, 'thumbnailOverlayTimeStatusRenderer'))
                            is_live = (thumbnailOverlayTimeStatusRenderer) ? thumbnailOverlayTimeStatusRenderer.thumbnailOverlayTimeStatusRenderer.style.toLowerCase() === 'live' : is_live
                        } catch {}
                    }
                    return  e.richItemRenderer &&
                        e.richItemRenderer.content &&
                        e.richItemRenderer.content.videoRenderer &&
                        e.richItemRenderer.content.videoRenderer.upcomingEventData || is_live
                });
                contents = contents.sort((a,b) => {
                    try {
                        return a.richItemRenderer.content.videoRenderer.upcomingEventData.startTime > b.richItemRenderer.content.videoRenderer.upcomingEventData.startTime || -1
                    } catch { return -1 }
                })
                if (contents.length > 0) {
                    //console.log(contents.length)
                    //console.log(contents[0].richItemRenderer.content)
                    //console.log(contents[1].richItemRenderer.content)
                    const i = 0
                    const {videoId} = contents[i].richItemRenderer.content.videoRenderer
                    const videoLink = `https://www.youtube.com/watch?v=${videoId}`
                    const title = contents[i].richItemRenderer.content.videoRenderer.title.runs.map(e => {
                        return e.text
                    }).join(' ')
                    let live = Object.hasOwn(contents[i].richItemRenderer.content.videoRenderer, 'upcomingEventData')
                    let has_upcoming_event_data = Boolean(live)
                    live = (!has_upcoming_event_data) ? STREAM_STATUS.LIVE : STREAM_STATUS.INDETERMINATE
                    let streamStartTime = (has_upcoming_event_data) ? contents[i].richItemRenderer.content.videoRenderer.upcomingEventData.startTime : null
                    if (streamStartTime) {
                        const expectedStartTime = parseInt(streamStartTime) * 1000
                        const waitTimeLeftMS = expectedStartTime - (new Date().getTime())
                        streamStartTime = new Date(expectedStartTime)
                        if (waitTimeLeftMS > 1800 * 1000) {
                            live = STREAM_STATUS.OFFLINE
                        }
                    }
                    //console.log(streamStartTime)
                    const live_status = { error: null, result: { live, title, videoLink, streamStartTime, channel: "IRyS Ch. hololive-EN" } }
                    //console.dir(live_status, {depth: null})
                    return live_status
                }
            } catch (err) {
                console.log('extractLivestreamInfo: ', err)
            }
        }
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
        //console.log('basicResponse: ', basicResponse)
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
    //channelID = 'UC6eWCld0KwmyHFbAqK3V-Rw'
    const { error, result: youtubeHTML } = await fetchLivestreamPage(channelID)
    if (error) {
        //console.log('error: ', error)
        return { error, result: null }
    }
    //console.dir(extractLivestreamInfo(youtubeHTML))

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
