export default async function getReps() {
    try {
        const { parseString } = require('xml2js')
        const playlistURLs = [
            'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw07nf_D8u-g6a3_MdLWVdIc',
            'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw2Wlox1cPU2-WGM5VmMYR8m',
            'https://www.youtube.com/feeds/videos.xml?channel_id=UCyWyNomzTjBvuRsqZU1bRCg'
        ]
        const skip_vids = [
            'https://www.youtube.com/watch?v=-HZ9gAiIoAw', /* IRyS 2nd EP ｢Journey｣ Trailer */
            'https://www.youtube.com/watch?v=w0sSTxFSAlQ' /* ||:Caesura of Despair - First EP Preview video */
        ]

        let reps = [];

        for(const url of playlistURLs) {
            let xmlRes = await fetch(url)
            let xml = await xmlRes.text()
            parseString(xml, {trim: true}, function(err, result) {
                if (err) { 
                    return; 
                }
                result.feed.entry.forEach(e => {
                    let link = e.link[0]['$'].href

                    if (skip_vids.indexOf(link) > -1) {
                        return;
                    }

                    let views = (e['media:group'][0]['media:community'][0]['media:statistics'][0]['$'].views)
                    let channel = e['yt:channelId'][0]
                    let title = e['media:group'][0]['media:title'][0]
                    let thumbnail = e['media:group'][0]['media:thumbnail'][0]['$']
                    let channelUrl = "https://www.youtube.com/channel/" + channel;
                    
                    if(!String(link).startsWith('http')) {
                        return;
                    }

                    reps.push({ 
                        url: String(link), 
                        views, 
                        channel, 
                        channelUrl,
                        title,
                        thumbnail,
                        topic: channel == 'UCyWyNomzTjBvuRsqZU1bRCg'
                    });
                    
                });
            });
        }

        return reps
    } catch (err) {
        console.error(err)
        return []
    }
}
