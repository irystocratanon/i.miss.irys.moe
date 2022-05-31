const {parseString} = require('xml2js')

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
            await items.forEach(item => {
                item.description = item.description.map(d => {
                    return d.replace(/piped.kavin.rocks\//g, 'www.youtube.com/watch?v=').replace(/youtu.be\//g, 'www.youtube.com/watch?v=').replace(endpointRegExp, 'href="https://twitter.com/')
                })
                _tweets.push({type: 'twitter', date: new Date(item.pubDate), data: item})
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
    let leddit = await fetch('https://old.reddit.com/user/IRySoWise.rss')
    await parseString(await leddit.text(), {trim: true}, function(err,res) {
        if (err) { return; }
        if (!res || !res.feed) { return; }
        let items = res.feed.entry
        if (!items || items.length < 1) { return; }
        items.forEach(item => {
            socials.push({type: 'reddit', date: new Date(item.updated), data: item})
        })
    })
    let nitterEndpoints = ['https://nitter.irys.moe', 'https://nitter.net']

    for (let endpoint of nitterEndpoints) {
        let tweets = await fetchTweets(endpoint.replace(/https?:\/\//, ''), `${endpoint}/irys_en/with_replies/rss`)
        if (tweets.length === 0 || !tweets) { continue; }
        tweets.forEach(tweet => { socials.push(tweet); })
        break   
    }
    return socials.sort((a,b) => { return Date.parse(a.date) < Date.parse(b.date) || -1 });
}

export default async function(req, res) {
    let socials = await getSocials()
    return res.status(200).json(JSON.stringify(socials))
}
