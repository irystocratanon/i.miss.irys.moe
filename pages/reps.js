export default function Home(props) {}

// https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
Home.getInitialProps = async function ({ res }) {
    const {parseString} = require('xml2js')
    let reps = []
    let rep = ''
    const playlistURLs = [
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw07nf_D8u-g6a3_MdLWVdIc',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw2Wlox1cPU2-WGM5VmMYR8m'
    ]

    for (let i = 0; i < playlistURLs.length; i++) {
        let url = playlistURLs[i]
        let xmlRes = await fetch(url)
        let xml = await xmlRes.text()
        parseString(xml, {trim: true}, function(err, result) {
            if (err) { return; }
            result.feed.entry.map(e => { return e.link[0]['$'].href; }).forEach(v => {
                if (String(v).startsWith('http')) {
                    reps.push(v)
                }
            })
        })
    }

    rep = reps[Math.floor(Math.random()*reps.length)]

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
