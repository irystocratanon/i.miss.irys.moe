function createPollRoute(channelID) {
    return `https://holodex.net/api/v2/channels/${channelID}/videos?lang=en&type=stream%2Cplaceholder&include=live_info&limit=24&offset=0&paginated=true`
}

export async function fetchPaststreamPage(channelID) {
    try {
        const res = await fetch(createPollRoute(channelID))
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
        }
        const youtubeJSON = await res.json()
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
