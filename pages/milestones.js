import Head from "next/head"
import React from 'react';
import styles from '../styles/Milestones.module.css'
import { milestoneDelta } from "../server/milestone"
import getReps from "../server/reps_poller"

class NumberFormat extends React.Component {
    render() {
        return <span className={this.props.className}>{this.props.value.toLocaleString()}</span>
    }
}

export default class MilestonesApp extends React.Component {

  static async getInitialProps({ res }) {
    const reps = Array.from(await getReps())
          .map(rep => {
              if (typeof rep !== 'object') { return; }
              rep.milestone = milestoneDelta(rep.views || 0);
              return rep;
          })
          .sort((a, b) => a.milestone.delta - b.milestone.delta);

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
