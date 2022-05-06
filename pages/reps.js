export default function Home(props) {}

// https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
Home.getInitialProps = async function ({ res }) {
    const {parseString} = require('xml2js')
    let reps = []
    let rep = ''
    let leastViews = 0
    let leastViewsIndex = ''
    const playlistURLs = [
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw07nf_D8u-g6a3_MdLWVdIc',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw2Wlox1cPU2-WGM5VmMYR8m'
    ]
    const skip_vids = [
        'https://www.youtube.com/watch?v=-HZ9gAiIoAw' /* IRyS 2nd EP ｢Journey｣ Trailer */
    ]

    for (let i = 0; i < playlistURLs.length; i++) {
        let url = playlistURLs[i]
        let xmlRes = await fetch(url)
        let xml = await xmlRes.text()
        parseString(xml, {trim: true}, function(err, result) {
            if (err) { return; }
            result.feed.entry.map(e => {
                let link = e.link[0]['$'].href
                if (skip_vids.indexOf(link) > -1) {
                    return null
                }
                let e_views = (e['media:group'][0]['media:community'][0]['media:statistics'][0]['$'].views)
                leastViews = (leastViews === 0) ? Number(e_views) : leastViews
                leastViews = (e_views < leastViews) ? Number(e_views) : leastViews
                if (leastViews === Number(e_views)) {
                    leastViewsIndex = link
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
    // this should never happen
    if (leastViewsIndex < 0 || leastViewsIndex > reps.length) {
        rep = reps[Math.floor(Math.random()*reps.length)]
    } else {
        // get rep with a slight bias towards the video with the least views
        rep = reps[Math.floor(getRndBias(0, reps.length-1, leastViewsIndex, 0.25))]
    }

    if (res && String(rep).startsWith('http')) {
        res.writeHead(302, {
            Location: rep
        });
        res.end();
    } else {
        res.writeHead(200)
        res.end();
    }
    return {};
}
