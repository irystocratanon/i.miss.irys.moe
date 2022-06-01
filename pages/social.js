import Head from "next/head"
import Link from "next/link"

import {intervalToDuration,formatDuration} from "date-fns"

import {getSocials} from '../pages/api/social.js'
import styles from '../styles/Social.module.css'

export async function getServerSideProps({ res }) {
    const social = await getSocials()
    const currentDate = new Date()
    return { props: {
        social: social.map(e => {
            const duration = intervalToDuration({start: e.date, end: currentDate})
            let formatDurationOpts = {format: ['years']}
            if (duration.years === 0 || !duration.hasOwnProperty('years')) { formatDurationOpts['format'].push('months') }
            if (duration.months === 0 || !duration.hasOwnProperty('months')) { formatDurationOpts['format'].push('weeks') }
            if (duration.weeks === 0 || !duration.hasOwnProperty('weeks')) { formatDurationOpts['format'].push('days') }
            if (duration.days === 0 || !duration.hasOwnProperty('days')) { formatDurationOpts['format'].push('hours') }
            if (duration.hours === 0 || !duration.hasOwnProperty('hours')) { formatDurationOpts['format'].push('minutes') }
            if (duration.minutes === 0 || !duration.hasOwnProperty('minutes')) { formatDurationOpts['format'].push('seconds') }

            return {
                type: e.type,
                date: `${formatDuration(duration, formatDurationOpts)} ago`,
                data: e.data
            }})
        }}
}

export default function SocialsApp(props) {
        let { social } = props

        const formatTwitter = t => {
            const guid = t.data.guid[0].replace(/#.*/g, '').split('/').pop()
            return (
                <div style={{margin: '0.5em'}}>
                    <small style={{color: 'dimgray'}}>{t.date}</small>
                    <blockquote dangerouslySetInnerHTML={{__html: t.data.description[0]}}>
                    </blockquote>
                    <small><a href={`https://twitter.com/irys_en/status/${guid}`}>{`https://twitter.com/irys_en/status/${guid}`}</a></small>
                </div>
            )
        }

        const formatLeddit = l => {
            const hasLink = (l.data.content[0]['_'].indexOf('submitted by &#32; <a href="https://old.reddit.com/user/IRySoWise"> /u/IRySoWise </a>') > -1)
            const permalink = l.data.link[0]['$'].href
            return (
                <div className={styles.reddit} style={{margin: '0.5em'}}>
                    <small style={{color: 'dimgray'}}>{l.date}</small>
                    <br /><strong>{l.data.title[0]}</strong>
                    <blockquote dangerouslySetInnerHTML={{__html: l.data.content[0]['_'] }}>
                    </blockquote>
                    {!hasLink && <small><a href={permalink}>{permalink}</a></small>}
                </div>
            )
        }

        const formatYouTubeCommunity = y => {
            return (
                <div style={{margin: '0.5em'}}>
                    <small style={{color: 'dimgray'}}>{y.date}</small>
                <blockquote>
                    {y.data.content[0].text}
                    {y.data.video instanceof Object && y.data.attachmentType === 'VIDEO' && [<br key={y.data.id} />,<iframe key={y.data.id} width="940" height="529" src={`https://www.youtube.com/embed/${y.data.video.id}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>]}
                    {y.data.images instanceof Array && y.data.images.length > 0 && y.data.attachmentType === 'IMAGE' && y.data.images.map((img,i) => (
                    <span key={i}>
                        <br />
                        <img src={img} />
                    </span>
                    ))}
                </blockquote>
                <small><a href={`https://www.youtube.com/post/${y.data.id}`}>{`https://www.youtube.com/post/${y.data.id}`}</a></small>
                </div>
            )
        }

        const formatSocial = s => {
            switch (s.type) {
                case 'twitter':
                    return formatTwitter(s)
                case 'reddit':
                    return formatLeddit(s)
                case 'youtube':
                    return formatYouTubeCommunity(s)
            }
        }

        return <div className={styles.site}>
            <Head>
            <title>IRySocial</title>
            <link rel="shortcut icon" href="/Socool.png" />
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content="IRySocial" property="og:description" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        <div>
            <section style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <Link href="/">I miss her&hellip;</Link>
                &nbsp;|&nbsp;
                <Link href="/milestones">Milestones</Link>
                &nbsp;|&nbsp;
                <Link href="/karaoke">Karaoke</Link>
                &nbsp;|&nbsp;
                <Link href="/social">IRySocial</Link>
            </section>
            <section className={styles.socialContainer}>
            {social.map((s, i) => (
                <div key={i} className={styles.socialItem}>{formatSocial(s)}</div>
            ))}
            </section>
        </div>
    </div>
}
