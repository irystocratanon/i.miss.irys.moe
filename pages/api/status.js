import getResult from "../../server/poller.js"
import {invalidateHTTPResCache} from "../../server/lib/http-response-helper.js"

export default async function(req, res) {
    const {error,result,pastStream} = await getResult()
    if (error) {
        console.warn(error)
        invalidateHTTPResCache(res)
        return res.status(503).json({error: (error instanceof Error) ? error.message : "Service Unavailable"})
    }
    const json = {
        live: result?.live,
        title: result?.title || pastStream?.title || null,
        videoLink: result?.videoLink || (pastStream?.videoLink ? pastStream.videoLink : `https://www.youtube.com/watch?v=${pastStream?.id}`),
        channel: result?.channel || pastStream?.channel || "IRyS Ch. hololive-EN"
    }
    return res.status(200).json(json)
}
