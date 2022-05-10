import getReps from "../server/reps_poller"
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
    const reps = Array.from(await getReps())
                    .sort((a,b) => a.views - b.views)
    const leastViewsIndex = reps.findIndex(e => { return e.channel === process.env.WATCH_CHANNEL_ID })
    const leastTopicViewsIndex = reps.findIndex(e => { return e.topic && e.title.toLowerCase().indexOf('instrumental') !== e.title.length-13 })

    console.debug(`[reps leastViewsIndex]: ${reps[leastViewsIndex].title} - ${reps[leastViewsIndex].url}`);
    console.debug(`[reps leastTopicViewsIndex]: ${reps[leastTopicViewsIndex].title} - ${reps[leastTopicViewsIndex].url}`);

    // https://stackoverflow.com/a/29325222
    function getRndBias(min, max, bias, influence) {
        var rnd = Math.random() * (max - min) + min,   // random in range
            mix = Math.random() * influence;           // random mixer
        return rnd * (1 - mix) + bias * mix;           // mix full range and bias
    }

    let randomBias = ((Math.floor(Math.random()*2)) === 0) ? leastViewsIndex : leastTopicViewsIndex
    let rep

    // this should never happen
    if (randomBias < 0 || randomBias > reps.length) {
        rep = reps[Math.floor(Math.random()*reps.length)]
    } else {
        // get rep with a slight bias towards the video with the least views
        console.debug(`[reps bias] (${(reps[randomBias].topic) ? 'IRyS - Topic' : 'IRyS Ch. hololive-EN'}): ${reps[randomBias].title} - ${reps[randomBias].url}`);
        rep = reps[Math.floor(getRndBias(0, reps.length-1, randomBias, 0.25))]
    }

    if (res && String(rep.url).startsWith('http')) {
        res.writeHead(302, {
            Location: rep.url
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
