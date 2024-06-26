import {parseString} from 'xml2js'
import {extractPlayerInfo} from 'yt-scraping-utilities'

export default async function getReps() {
    try {
        const playlistURLs = [
            'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw07nf_D8u-g6a3_MdLWVdIc',
            'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw2Wlox1cPU2-WGM5VmMYR8m',
            'https://www.youtube.com/feeds/videos.xml?channel_id=UCyWyNomzTjBvuRsqZU1bRCg'
        ]
        const skip_vids = [
            'https://www.youtube.com/watch?v=-HZ9gAiIoAw', /* IRyS 2nd EP ｢Journey｣ Trailer */
            'https://www.youtube.com/watch?v=w0sSTxFSAlQ' /* ||:Caesura of Despair - First EP Preview video */
        ]

        const manualTopicReps = [
            'https://www.youtube.com/watch?v=rAO-w9stKAU', /* Star Flower - Story Time */
        ]

        const manualReps = [
            'https://www.youtube.com/watch?v=HrT8Oon9Kxs', /* 【MV】Daikirai Na Hazu Datta - Honeyworks || HAKOS BAELZ X IRYS COVER
 */
            'https://www.youtube.com/watch?v=FPzV-3vLRd8', /* 【歌ってみた】Snow halation【がうる・ぐら、ワトソン・アメリア、小鳥遊キアラ、IRyS】 */
            'https://www.youtube.com/watch?v=7M5yHLKwdng', /* 【Cover/歌ってみた】oath sign【ときのそら/IRyS】 */
            'https://www.youtube.com/watch?v=4w3zoAbxkbo', /* 【Cover/歌ってみた】威風堂々【ときのそら/AZKi/星街すいせい/Mori Calliope/IRyS】 */
            'https://www.youtube.com/watch?v=YzS26Ao3vt8', /* 【ANIMATION MV】A Million Miles Away - BELLE || HAKOS BAELZ COVER  */
            'https://www.youtube.com/watch?v=kPyLnwSXqkA', /* The Twelve Days of Christmas - hololive English Cover */
            'https://www.youtube.com/watch?v=uFJHdT_ie9U', /* Ochame Kinou - hololive English Cover */
            'https://www.youtube.com/watch?v=bitH6NZ_e2Q', /*  【MV】 Connect the World 【hololive English Original Song】 */
            ...manualTopicReps
        ]

        let reps = [];
        let ids = {};

        const manualRepsPromises = manualReps.map(url => fetch(url));

        for (const _req of manualRepsPromises) {
            const req = await _req
            const i = manualReps.indexOf(req.url);
            let info = extractPlayerInfo(await req.text());
            info.topic = manualTopicReps.indexOf(manualReps[i]) != -1;
            info.views = info.viewers
            info.url = `https://www.youtube.com/watch?v=${info.videoId}`
            info.thumbnail = {
                url: `https://i3.ytimg.com/vi/${info.videoId}/hqdefault.jpg`
            }
            reps.push(JSON.parse(JSON.stringify(info)));
            ids[String(info.url)]=true;
        }

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
                    let videoId = e['yt:videoId']
                    try {
                        videoId = (videoId) ? videoId[0] : link.match(/\?v=(.*)/)[1]
                    } catch { videoId = null; }
                    let thumbnail = e['media:group'][0]['media:thumbnail'][0]['$']
                    let channelUrl = "https://www.youtube.com/channel/" + channel;
                    
                    if(!String(link).startsWith('http')) {
                        return;
                    }

                    // don't add duplicates
                    if(ids[String(link)] === true) {
                        // is already in the list
                        return;
                    }

                    ids[String(link)] = true;

                    reps.push({
                        videoId,
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
