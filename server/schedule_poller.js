const {parseString} = require('xml2js')

export default async function schedulePoller(callback) {
    let images = []
    let rssFeed
    const controller = new AbortController()
    let abortTimeout = setTimeout(() => { return controller.abort() }, 30*1000)
    // twitter search sucks. The single regex I used before used to work but stopped recently
    const queries = [
        'https://nitter.irys.moe/irys_en/search/rss?f=tweets&q=%F0%9F%92%8E%28.*%29Schedule+%28.*%29%F0%9F%92%8E&f-images=on&since=&until=&near=',
        'https://nitter.irys.moe/irys_en/search/rss?f=tweets&q=%F0%9F%92%8E%28.*%29ScheduleRyS+%28.*%29%F0%9F%92%8E&f-images=on&since=&until=&near=',
        'https://nitter.irys.moe/irys_en/search/rss?f=tweets&q=%F0%9F%92%8E%28.*%29Schedule%20RyS+%28.*%29%F0%9F%92%8E&f-images=on&since=&until=&near='
    ]
    let pubDate
    for (let query of queries) {
        await fetch(query, {signal: controller.signal}).then(async function(res) {
            rssFeed = await res.text()
            parseString(rssFeed, {trim: true}, async function(err, result) {
                if (err) {
                    return 
                }
                if (!result || !result.rss || !(result.rss.channel instanceof Array) || result.rss.channel.length < 1 || !result.rss.channel[0].item) {
                    return
                }
                let items = result.rss.channel[0].item.filter(e => {
                    if (e['dc:creator'][0] !== '@irys_en') {
                        return false
                    }
                    return e.description.join('').indexOf('<img src="') > -1
                })
                await items.forEach(item => {
                    let urls = item.description.join('').match(/\<img src=".*" \/\>/g)
                    for (let i = 0; i < urls.length; i++) {
                        let url = urls[i]
                        url = url.split('=')
                        url = (url[1].split('"')[1])
                        url = url.replace(/^https?:\/\//, '//')
                        if (!pubDate || new Date(item.pubDate) > pubDate) {
                            images = [url]
                        }
                        pubDate = new Date(item.pubDate)
                    }
                })
            })
        }).catch(e => {})
        clearTimeout(abortTimeout)
    }
    if (callback && images.length > 0) {
        callback(images)
    }
}
