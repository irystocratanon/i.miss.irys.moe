import Head from "next/head"
import React from 'react';
import styles from '../styles/Milestones.module.css'
import { milestoneDelta } from "../server/milestone"

class NumberFormat extends React.Component {
    render() {
        return <span className={this.props.className}>{this.props.value.toLocaleString()}</span>
    }
}

export default class MilestonesApp extends React.Component {

  static async getInitialProps({ res }) {
    let { parseString } = require('xml2js')
    let playlistURLs = [
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw07nf_D8u-g6a3_MdLWVdIc',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLpBqtLy3mHw2Wlox1cPU2-WGM5VmMYR8m',
        'https://www.youtube.com/feeds/videos.xml?channel_id=UCyWyNomzTjBvuRsqZU1bRCg'
    ]
    let skip_vids = [
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
                    topic: channel == 'UCyWyNomzTjBvuRsqZU1bRCg',
                    milestone: milestoneDelta(views)
                });
                
            });
        });
    }

    reps.sort((a, b) => a.milestone.delta - b.milestone.delta);

    return { 
        vids: reps, 
        top: reps[0],
        topics: reps.filter(v => v.topic),
        nonTopics: reps.filter(v => !v.topic)
     };
  }

  render() {
    let { vids, top, topics, nonTopics } = this.props;

    return <div className={styles.site}>
        <Head>
            <title>Milestones</title>
            <link rel="shortcut icon" href="/Woah.png" />
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content="IRyS Milestones" property="og:description" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        <div>
            <section className={styles.top}>
                <h3>Next Milestone</h3>
                <div><a href={top.url}><img src={top.thumbnail.url}></img></a></div>
                <a href={top.url}>{top.title}</a>
                <div> is <NumberFormat value={top.milestone.delta}></NumberFormat> views away from <NumberFormat className={top.milestone.million ? styles.million : ''} value={top.milestone.milestone}></NumberFormat>!!</div>
            </section>

            <section className={styles.mid}>
                <h3>IRyS Channel Milestones</h3>
                <table width="100%">
                    <tbody>
                        {nonTopics.slice(0, 3).map((r) => (
                        <tr key={r.url}>
                            <td className={styles.titlecol}><a href={r.url}>{r.title}</a></td>
                            <td className={styles.numcol}><NumberFormat value={r.milestone.delta}/> away from <NumberFormat value={r.milestone.milestone}/>!!</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            <section className={styles.bottom}>
                <h3>Topic Channel Milestones</h3>
                <table width="100%">
                    <tbody>
                        {topics.slice(0, 3).map((r) => (
                        <tr key={r.url}>
                            <td className={styles.titlecol}><a href={r.url}>{r.title}</a></td>
                            <td className={styles.numcol}><NumberFormat value={r.milestone.delta}/> away from <NumberFormat value={r.milestone.milestone}/>!!</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    </div>

    return 
  }
}
