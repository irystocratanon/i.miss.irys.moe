import {exists as _exists, readFile as _readFile, writeFile as _writeFile} from 'fs'
import {promisify} from 'util'
import {addMinutes} from 'date-fns'

const INVALIDATE_CACHE = {shouldInvalidateCache: true, cache: null}

export async function checkCache(jsonCache, minutes_to_invalidate_cache = 15) {
    const exists = promisify(_exists)
    const readFile = promisify(_readFile)

    try {
        await exists(jsonCache)
    } catch (e) {
        return INVALIDATE_CACHE
    }

    let json, cache, d
    try {
        json = await readFile(jsonCache)
        cache = JSON.parse(json.toString())
        d = new Date(cache["cache-control"])
        if (minutes_to_invalidate_cache > 5) {
            let stream_status
            try {
                stream_status = cache.result.items[0].status
            } catch(e) {
                stream_status = "past"
            }
            if (stream_status === "live") {
                minutes_to_invalidate_cache = 5
            }
        }
    } catch (e) {
        return INVALIDATE_CACHE
    }
    let expiryDate = addMinutes(d, minutes_to_invalidate_cache)
    if (Date.now() >= expiryDate.getTime()) { return INVALIDATE_CACHE; }
    
    return {shouldInvalidateCache: false, cache: cache}
}

export async function writeToCache(jsonCache, json) {
    const writeFile = promisify(_writeFile)

    try {
        json = JSON.stringify({"cache-control": Date.now(), "result": json})
        await writeFile(jsonCache, json)
    } catch (e) {
        return
    }
}
