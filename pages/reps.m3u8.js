import performance from '../server/lib/get-performance.js'
import getReps from "../server/reps_poller"
export default function Home(props) {}

Home.getInitialProps = async function ({ res }) {
    let reqT0 = performance.now()
    const reps = Array.from(await getReps())
        .sort((a,b) => a.views - b.views)

    let m3u8 = `#EXTM3U`;

    for (let i = 0; i < reps.length; i++) {
        m3u8 += `

#EXTINF:-1,${reps[i].title}
${reps[i].url}`
    }

    res.writeHead(200, {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "s-maxage=1, stale-while-revalidate"
    });
    res.end(m3u8);

    let reqT1 = performance.now()
    console.debug(`[reps total request time] ${reqT1-reqT0}`);
    return {};
}
