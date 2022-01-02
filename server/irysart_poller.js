const {parseString} = require('xml2js')

//const fs = require('fs')
//
//const rssFeed = fs.readFileSync('rss.xml')

export default async function irysartPoller(callback) {
    let images = []
    let rssFeed
    const req = await fetch('https://nitter.irys.moe/search/rss\?f\=tweets\&q\=%23IRySart\&f-images\=on\&since\=\&until\=\&near\=')
    rssFeed = await req.text()
    parseString(rssFeed, {trim: true}, async function(err, result) {
        if (err) {
            return 
        }
        let items = result.rss.channel[0].item.filter(e => {
            return e.description.join('').indexOf('<img src="') > -1
        })
        await items.forEach(item => {
            let urls = item.description.join('').match(/\<img src=".*" \/\>/)
            let url = urls[0]
            url = url.split('=')
            url = (url[1].split('"')[1])
            url = url.replace(/^https?:\/\//, '//')
            images.push(url)
        })
        if (callback && images.length > 0) {
            callback(images)
        }
    })
}
