import {exists as _exists, readFile as _readFile, writeFile as _writeFile} from 'fs'
import {promisify} from 'util'
import {addMinutes} from 'date-fns'

const INVALIDATE_CACHE = {shouldInvalidateCache: true, cache: null}

import {LIVESTREAM_CACHE} from "../constants"

export function getDefaultRequestHeaders(headers = {}) {
    const userAgent = `${process.env.PUBLIC_HOSTNAME} (${process.env.VERCEL_ENV || process.env.NODE_ENV || "development"})`
    if (!headers instanceof Object) {
        headers = {}
    }
    if (!headers.hasOwnProperty('headers')) {
        headers.headers = {}
    }
    headers.headers['User-Agent'] = userAgent
    console.log(headers)
    return headers
}

export async function checkCache(jsonCache, minutes_to_invalidate_cache = 15) {
    if (minutes_to_invalidate_cache < 1) {
        return INVALIDATE_CACHE
    }
    const exists = promisify(_exists)
    const readFile = promisify(_readFile)

    try {
        const cacheExists = await exists(jsonCache)
        if (!cacheExists) {
            return INVALIDATE_CACHE
        }
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

export async function readLivestreamFromCache() {
    const exists = promisify(_exists)
    const readFile = promisify(_readFile)

    try {
        const liveStreamCacheExists = await exists(LIVESTREAM_CACHE)
        if (!liveStreamCacheExists) {
            return null
        }
        let cache = await readFile(LIVESTREAM_CACHE)
        cache = JSON.parse(cache.toString())
        return cache
    } catch (e) {
        return null
    }
}

export async function writeLivestreamToCache(json) {
    const writeFile = promisify(_writeFile)
    try {
        const cache = {
            title: json.title,
            videoLink: json.videoLink,
            lastSeen: Date.now()
        }
        writeFile(LIVESTREAM_CACHE, JSON.stringify(cache))
    } catch (e) {
        return
    }
}
