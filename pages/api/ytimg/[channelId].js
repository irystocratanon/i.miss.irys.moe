import { extractChannelInfo } from "yt-scraping-utilities"

export default async function(req, res) {
    if (!req || !req.query || !req.query.channelId) {
        return res.status(403);
    }
    const {channelId} = req.query
    const channelReq = await fetch(`https://www.youtube.com/channel/${channelId}`);
    const data = await channelReq.text();
    const json = extractChannelInfo(data);
    if (!json.avatarUrl) {
        return res.status(500);
    }
    res.writeHead(302, {
        "Location": json.avatarUrl,
        "Cache-Control": "public, max-age=86400, no-transform"
    });
    res.end()
}
