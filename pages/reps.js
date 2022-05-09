export default function Home(props) {}

// https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
Home.getInitialProps = async function ({ res }) {
    let _performance
    if (typeof performance !== 'object') {
        try {
            _performance = require('perf_hooks')
            _performance = _performance.performance
        } catch (e) {
            _performance = {now: function(){}}
        }
    } else {
        _performance = performance
    }
    let reqT0 = _performance.now()
    const {parseString} = require('xml2js')
    let reps = []
    let rep = ''
    let leastViews = 0
    let leastViewsIndex = ''
    let leastTopicViews = 0
    let leastTopicViewsIndex = ''
    const playlistURLs = [
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw07nf_D8u-g6a3_MdLWVdIc',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw2Wlox1cPU2-WGM5VmMYR8m',
        'https://www.youtube.com/feeds/videos.xml?channel_id=UCyWyNomzTjBvuRsqZU1bRCg'
    ]
    const skip_vids = [
        'https://www.youtube.com/watch?v=-HZ9gAiIoAw', /* IRyS 2nd EP ｢Journey｣ Trailer */
        'https://www.youtube.com/watch?v=w0sSTxFSAlQ' /* ||:Caesura of Despair - First EP Preview video */
    ]

    for (let i = 0; i < playlistURLs.length; i++) {
        let t0 = _performance.now()
        let url = playlistURLs[i]
        let xmlRes = await fetch(url)
        let t1 = _performance.now()
        console.debug(`[reps fetch:${url}] ${t1-t0}`);
        t0 = _performance.now()
        let xml = await xmlRes.text()
        parseString(xml, {trim: true}, function(err, result) {
            t1 = _performance.now()
            console.debug(`[reps parseString] ${t1-t0}`);
            if (err) { return; }
            result.feed.entry.map(e => {
                let link = e.link[0]['$'].href
                if (skip_vids.indexOf(link) > -1) {
                    return null
                }
                let e_views = (e['media:group'][0]['media:community'][0]['media:statistics'][0]['$'].views)
                switch (e['yt:channelId'][0]) {
                    case process.env.WATCH_CHANNEL_ID:
                        leastViews = (leastViews === 0) ? Number(e_views) : leastViews
                        leastViews = (e_views < leastViews) ? Number(e_views) : leastViews
                        if (leastViews === Number(e_views)) {
                            leastViewsIndex = link
                        }
                        break;
                    case 'UCyWyNomzTjBvuRsqZU1bRCg':
                        leastTopicViews = (leastTopicViews === 0) ? Number(e_views) : leastTopicViews
                        leastTopicViews = (e_views < leastTopicViews) ? Number(e_views) : leastTopicViews
                        if (leastTopicViews === Number(e_views)) {
                            leastTopicViewsIndex = link
                        }
                        break;
                }
                return link
            }).forEach(v => {
                if (String(v).startsWith('http')) {
                    reps.push(v)
                }
            })
        })
    }

    // https://stackoverflow.com/a/29325222
    function getRndBias(min, max, bias, influence) {
        var rnd = Math.random() * (max - min) + min,   // random in range
            mix = Math.random() * influence;           // random mixer
        return rnd * (1 - mix) + bias * mix;           // mix full range and bias
    }

    leastViewsIndex = reps.indexOf(leastViewsIndex)
    leastTopicViewsIndex = reps.indexOf(leastTopicViewsIndex)

    let randomBias = ((Math.floor(Math.random()*2)) === 0) ? leastViewsIndex : leastTopicViewsIndex

    // this should never happen
    if (randomBias < 0 || randomBias > reps.length) {
        rep = reps[Math.floor(Math.random()*reps.length)]
    } else {
        // get rep with a slight bias towards the video with the least views
        console.debug(`[reps bias] ${randomBias}: ${reps[randomBias]}`);
        rep = reps[Math.floor(getRndBias(0, reps.length-1, randomBias, 0.25))]
    }

    if (res && String(rep).startsWith('http')) {
        res.writeHead(302, {
            Location: rep
        });
        res.end();
    } else if (res) {
        res.writeHead(302, {
            Location: `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}/videos`
        });
        res.end();
    }
    let reqT1 = _performance.now()
    console.debug(`[reps total request time] ${reqT1-reqT0}`);
    return {};
}
