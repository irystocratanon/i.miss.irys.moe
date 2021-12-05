import fs from 'fs'
import {promisify} from 'util'

const jsonCache = `${__dirname}/collabs.json`

function createPollRoute(channelID) {
	//return `http://localhost:8000/data.json`
	return `https://holodex.net/api/v2/channels/${channelID}/collabs?lang=en&type=stream%2Cplaceholder&include=live_info&limit=24&offset=0&paginated=true`
}

async function checkCache() {
	const exists = promisify(fs.exists)
	const readFile = promisify(fs.readFile)

	let haveCache = await exists(jsonCache)
	if (!haveCache) { return {shouldInvalidateCache: true, cache: null}; }
	let json
	try {
		json = await readFile(jsonCache)
	} catch (e) {
		return {shouldInvalidateCache: true, cache: null}
	}
	const d = new Date(json["cache-control"])
	if (Date.now() >= (d+((1000*60)*15))) { return true; }
	return {shouldInvalidateCache: false, cache: JSON.parse(json.toString())}
}

async function writeCollabstreamPageToCache(json) {
	const writeFile = promisify(fs.writeFile)
	await writeFile(jsonCache, JSON.stringify({"cache-control": Date.now(), "result": json}));
}

export async function fetchCollabstreamPage(channelID) {
	let {shouldInvalidateCache, cache} = await checkCache()
	if (!shouldInvalidateCache) { console.log('cache hit!'); return {error: null, result: cache["result"]}; }
	console.log('cache miss!')
    try {
        const res = await fetch(createPollRoute(channelID))
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
        }
		const youtubeJSON = await res.json()
		writeCollabstreamPageToCache(youtubeJSON)
        return { error: null, result: youtubeJSON }
    } catch (e) {
        return { error: e.toString(), result: { items: [] } }
    }
}

export function extractCollabstreamInfo(fromPageContent) {
    const collabs = fromPageContent.items.filter(e => {
        return e.type === 'stream' &&
            e.topic_id !== 'shorts' &&
            (e.status === 'upcoming' || e.duration >= 1800)
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
