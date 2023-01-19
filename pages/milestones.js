import Head from "next/head"
import Link from "next/link"
import React from 'react'
import styles from '../styles/Milestones.module.css'
import { milestoneDelta } from "../server/milestone"
import getReps from "../server/reps_poller"

class NumberFormat extends React.Component {
    render() {
        return <span className={this.props.className}>{this.props.value.toLocaleString()}</span>
    }
}

export async function getServerSideProps({ res }) {
    
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

    return {props: {
        vids: reps, 
        top: reps[0],
        topMillionaire: closestMillionaire,
        topics: reps.filter(v => v.topic),
        nonTopics: reps.filter(v => !v.topic)
     }};
  }

export default function Milestones(props) {
    let { vids, top, topics, nonTopics, topMillionaire } = props;

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
        <section style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <Link href="/">I miss her&hellip;</Link>
                &nbsp;|&nbsp;
                <Link className="font-bold no-underline" href="/milestones">Milestones</Link>
                &nbsp;|&nbsp;
                <Link href="/karaoke">Karaoke</Link>
                &nbsp;|&nbsp;
                <Link href="/social">IRySocial</Link>
        </section>
        <div>

            {!top.milestone.million && <section className={styles.top}>
                <h3>Next Millionaire</h3>
                <div><a href={topMillionaire.url}><img src={topMillionaire.thumbnail.url}></img></a></div>
                <a href={topMillionaire.url}>{topMillionaire.title}</a>
                <div> is <NumberFormat value={topMillionaire.milestone.millionDelta}></NumberFormat> views away from <NumberFormat className={styles.million} value={top.milestone.millionMilestone}></NumberFormat>!!</div>
            </section>}

            <section className={styles.top}>
                <h3>Next Milestone</h3>
                <div><a href={top.url}><img src={top.thumbnail.url}></img></a></div>
                <a href={top.url}>{top.title}</a>
                <div> is <NumberFormat value={top.milestone.delta}></NumberFormat> views away from <NumberFormat className={top.milestone.million ? styles.million : ''} value={top.milestone.milestone}></NumberFormat>!!</div>
            </section>

            <section className={styles.milestones}>
            <section className={styles.mid}>
                <h3>Channel Milestones</h3>
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
        </section>
        </div>
    </div>

    return 
}
