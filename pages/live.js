import performance from '../server/lib/get-performance.js'
export default function Home(props) {}

Home.getInitialProps = async function ({ res }) {
    let reqT0 = performance.now()

    let req = await fetch(`${process.env.PUBLIC_HOST}/api/status`);

    let {live, videoLink} = await req.json()
    live = live || 1;

    if (res && live != 1 && videoLink) {
        res.writeHead(302, {
            Location: videoLink
        });
        res.end();
    } else if (res) {
        res.writeHead(302, {
            Location: `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}/live`
        });
        res.end();
    }
    let reqT1 = performance.now()
    console.debug(`[live total request time] ${reqT1-reqT0}`);
    return {};
}
