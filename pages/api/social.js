import performance from '../../server/lib/get-performance.js'
const {parseString} = require('xml2js')
import { extractCommunityPosts } from "yt-scraping-utilities"

const fetchTweets = async function (endpoint, url) {
    try {
        let tweets = await fetch(url)
        let _tweets = []
        let endpointRegExp
        eval(`endpointRegExp = new RegExp(/href="https?:\\/\\/${endpoint}\\//g)`)
        await parseString(await tweets.text(), {trim: true}, async function(err, res) {
            if (err) { return []; }
            if (!res || !res.rss || !res.rss.channel || ! res.rss.channel instanceof Array || res.rss.channel.length < 1) { return []; }
            let items = res.rss.channel[0].item
            if (!items || items.length < 1) { return []; }
            let nth_retweet = items.length
            await items.forEach((item,i) => {
                item.description = item.description.map(d => {
                    return d.replace(/piped.kavin.rocks\//g, 'www.youtube.com/watch?v=').replace(/youtu.be\//g, 'www.youtube.com/watch?v=').replace(endpointRegExp, 'href="https://twitter.com/').replace(/nitter.*\/(?<status>\w+)\/status/g, function(match, p1, p2, p3, offset, string) {return `twitter.com/${p1}/status`}).replace(/http:\/\//g, 'https://').replace(/#m\<\/a\>/g, '</a>')
                })
                const isRetweet = rt => {
                        if (rt.retweet) { return true; }
                        rt.retweet = !!(rt.title[0].startsWith('RT by @irys_en:'))
                        return rt.retweet
                }
                item.retweet = isRetweet(item)
                /*
                 * Sometimes the pubDate of a retweet will be the time it was created by its creator as opposed to the time it was retweeted
                 * this loop corrects that by fudging the pubDate timestamp based on the previous non-retweet.
                 * After this correction the retweets will be ordered semi-correctly when the socials array is sorted
                 */
                for (let j = i+1; j < items.length; j++) {
                    if (!isRetweet(items[j])) {
                        let pubDate
                        pubDate = new Date(items[j].pubDate)
                        if (Date.parse(new Date(item.pubDate)) > Date.parse(pubDate)) {
                            break
                        }
                        item.pubDate = new Date(Date.parse(pubDate)+(1000*(nth_retweet)))
                        item.pubDate = item.pubDate.toString()
                        nth_retweet-=1
                        break
                    }
                }
                let id = `${item.guid[0].split('/').pop().match(/^[0-9]+/)[0].toString()}`
                item.id = id
                _tweets.push({type: 'twitter', id: `tw${id}`, date: new Date(item.pubDate), data: item})
            })
        })
        return _tweets
    } catch (err) {
        console.error(err)
        return []
    }
}

export async function getSocials() {
    let socials = []
    let timingInfo = {}
    let t0, t1
    try {
        t0 = performance.now()
        let leddit = await fetch('https://old.reddit.com/user/IRySoWise.rss')
        await parseString(await leddit.text(), {trim: true}, function(err,res) {
            if (err) { return; }
            if (!res || !res.feed) { return; }
            let items = res.feed.entry
            if (!items || items.length < 1) { return; }
            items.forEach(item => {
                socials.push({type: 'reddit', id: `rdt${item.id[0]}`, date: new Date(item.updated), data: item})
            })
        })
        t1 = performance.now()
        timingInfo['rdt'] = t1-t0
    } catch (err) { console.error(err); }

    const nitterEndpoints = ['https://nitter.irys.moe', 'https://nitter.net']

    t0 = performance.now()
    for (let endpoint of nitterEndpoints) {
        let tweets
        try {
            tweets = await fetchTweets(endpoint.replace(/https?:\/\//, ''), `${endpoint}/irys_en/with_replies/rss`)
        } catch (err) { console.error(err); }
        if (tweets.length === 0 || !tweets) { continue; }
        tweets.forEach(tweet => { socials.push(tweet); })
        t1 = performance.now()
        if (tweets.length > 0) { timingInfo['twtr'] = t1-t0; }
        break   
    }

    try {
        t0 = performance.now()
        let youtubeCommunityPostReq = await fetch(`https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}/community`)
        let youtubeCommunityPosts = extractCommunityPosts(await youtubeCommunityPostReq.text())
        youtubeCommunityPosts.forEach(post => {
            let social = {type: 'youtube', date: new Date(post.approximatePostDate)}
            post.approximatePostDate = post.approximatePostDate.toString()
            social.data = post
            social.data.href = `https://www.youtube.com/post/${post.id}`
            social.id = `ytc${post.id}`
            post.content = post.content.filter(e => { return (!e) ? false : true })
            socials.push(social)
        })
        t1 = performance.now()
        if (youtubeCommunityPosts.length > 0) {
            timingInfo['ytc'] = t1-t0
        }
    } catch (err) { console.error(err); }

    const ytChannelFeeds = [
        `https://www.youtube.com/feeds/videos.xml?channel_id\=${process.env.WATCH_CHANNEL_ID}`,
        'https://www.youtube.com/feeds/videos.xml?channel_id=UCyWyNomzTjBvuRsqZU1bRCg'
    ]
    t0 = performance.now()
    for (let feed of ytChannelFeeds) {
        try {
            let youtubeVODsReq = await fetch(feed)
            parseString(await youtubeVODsReq.text(), function(err, res) {
                if (err) { return; }
                if (! res instanceof Object || !res.feed || !res.feed.entry || ! res.feed.entry instanceof Array || res.feed.entry.length <=0 ) { return; }
                res.feed.entry.forEach(vod => {
                    let id = vod['yt:videoId'][0]
                    let _id = id
                    _id = (id.video && id.video.id) ? id.video.id : id
                    socials.push({type: 'youtube', id: `yt${_id}`, date: new Date(vod.published[0]), data: {
                        attachmentType: 'VIDEO',
                        video: {id: id},
                        href: `https://www.youtube.com/watch?v=${vod['yt:videoId'][0]}`,
                        content: [{text: vod.title}]
                    }})
                })
            })
            t1 = performance.now()
            timingInfo['ytf'] = t1-t0
        } catch (err) { console.error(err); }
    }

    return {timingInfo, socials: socials.sort((a,b) => { return Date.parse(a.date) < Date.parse(b.date) || -1 }) };
}

export default async function(req, res) {
    let {timingInfo, socials } = await getSocials()
    res.setHeader("Server-Timing", Object.keys(timingInfo).map(k => { return `${k};dur=${timingInfo[k]}` }).join(', '))
    if (req.method === 'PATCH') {
        let date
        if (req.body.date) {
            try {
                date = new Date(req.body.date)
            } catch (e) { }
        }
        if (socials instanceof Array && socials.length > 0 && date instanceof Date) {
            socials = socials.filter(s => {
                if (req.body.id) {
                    let offset = req.body.id.split('|')
                    return new Date(s.date) >= date && offset.indexOf(s.id) === -1
                } else {
                    return new Date(s.date) >= date
                }
            })
            if (socials.length <= 0) {
                res.status(304)
                return res.end()
            }
        }
    }
    return res.status(200).json(JSON.stringify(socials))
}
