import performance from '../server/lib/get-performance.js'
import getReps from "../server/reps_poller"
import { milestoneDelta } from "../server/milestone"
export default function Home(props) {}

Home.getInitialProps = async function ({ res }) {
    let reqT0 = performance.now()

    var closestMillion = 1_000_000;
    var closestMillionaire = null;
    const reps = Array.from(await getReps())
          .map(rep => {
              if (typeof rep !== 'object') { return; }
              rep.milestone = milestoneDelta(rep.views || 0);
              if(rep.milestone.millionDelta < closestMillion) {
                closestMillion = rep.milestone.millionDelta
                closestMillionaire = rep;
              }
              return rep;
          })
        .sort((a, b) => a.milestone.delta - b.milestone.delta);

    res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=1, stale-while-revalidate"
    });
    res.end(JSON.stringify(reps));

    let reqT1 = performance.now()
    console.debug(`[reps total request time] ${reqT1-reqT0}`);
    return {};
}
