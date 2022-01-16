const {parseString} = require('xml2js')

export default async function irysartPoller(opts, callback) {
    let images = []
    if (opts.hasOwnProperty('image') && opts.image.startsWith('//')) {
        images.push(String(opts.image))
    }
    if (opts.scheduleRef?.current?.checked && opts.scheduleImg) {
        if (opts.scheduleImg && images.indexOf(opts.scheduleImg) < 0 && opts.scheduleImg.startsWith('//')) {
            images.push(String(opts.scheduleImg))
        }
    }
    let rssFeed
    const controller = new AbortController()
    let abortTimeout = setTimeout(() => { return controller.abort() }, 30*1000)
    fetch('https://nitter.irys.moe/search/rss\?f\=tweets\&q\=%23IRySart\&f-images\=on\&since\=\&until\=\&near\=', {signal: controller.signal}).then(async function(res) {
        rssFeed = await res.text()
        parseString(rssFeed, {trim: true}, async function(err, result) {
            if (err) {
                return 
            }
            let items = result.rss.channel[0].item.filter(e => {
                return e.description.join('').indexOf('<img src="') > -1
            })
            await items.forEach(item => {
                let urls = item.description.join('').match(/\<img src=".*" \/\>/g)
                for (let i = 0; i < urls.length; i++) {
                    let url = urls[i]
                    url = url.split('=')
                    url = (url[1].split('"')[1])
                    url = url.replace(/^https?:\/\//, '//')
                    images.push(url)
                }
            })
            if (callback && images.length > 0) {
                if (images.length < 5 && opts.irysartSet && opts.irysartSet instanceof Array) {
                    for (let i = 0; i < opts.irysartSet.length; i++) {
                        if (images.indexOf(opts.irysartSet[i]) < 0) {
                            images.push(opts.irysartSet[i])
                        }
                    }
                }
                callback(images)
            }
        })
    }).catch(e => {})
    clearTimeout(abortTimeout)
}
