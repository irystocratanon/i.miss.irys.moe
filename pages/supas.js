import performance from '../server/lib/get-performance.js'
export default function Home(props) {}

Home.getInitialProps = async function ({ res }) {
    let reqT0 = performance.now()

    // it's a bit shit that I can't seem to import node: modules here
    // without Webpack complaining severely. Let's consume our own API instead
    let public_host = process.env?.PUBLIC_HOST;
    try {
        if (public_host) {
            let current_status = await fetch(`${public_host}/api/status`);
            if (current_status.status == 200) {
                let json = await current_status.json();
                if (json?.videoLink && json.videoLink.indexOf("youtube.com") > -1 || json?.videoLink && json.videoLink.indexOf("youtu.be") > -1) {
                    try {
                        const videoLink = new URL(json.videoLink);
                        let id
                        switch (videoLink.host) {
                            case 'www.youtube.com':
                                id = videoLink.searchParams.get('v');
                                break;
                            case 'youtu.be':
                                id = videoLink.pathname.startsWith('/') ? videoLink.pathname.substr(1, videoLink.pathname.length) : videoLink.pathname
                                if (id.length < 1) {
                                    throw new Error("pathname not resolved correctly");
                                }
                                break;
                            default:
                                // deliberately left blank
                        }
                        res.writeHead(302, {
                            Location: `/supas/${id}.html`
                        });
                        return res.end();
                    } catch (e) { console.error(e); }
                }
            }
        }
    } catch {}

    res.writeHead(404);
    res.end();

    let reqT1 = performance.now()
    console.debug(`[reps total request time] ${reqT1-reqT0}`);
    return {};
}
