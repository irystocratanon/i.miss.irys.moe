import Head from "next/head"
import Link from "next/link"

import { useEffect, useState } from "react"

import {intervalToDuration,formatDuration} from "date-fns"

import {getSocials} from '../pages/api/social.js'
import styles from '../styles/Social.module.css'

function formatSocialItemDuration(d) {
    const currentDate = new Date()
    d = (d instanceof Date) ? d : new Date(d)
    const duration = intervalToDuration({start: d, end: currentDate})
    let formatDurationOpts = {format: ['years']}
    if (duration.years === 0 || !duration.hasOwnProperty('years')) { formatDurationOpts['format'].push('months') }
    if (duration.months === 0 || !duration.hasOwnProperty('months')) { formatDurationOpts['format'].push('weeks') }
    if (duration.weeks === 0 || !duration.hasOwnProperty('weeks')) { formatDurationOpts['format'].push('days') }
    if (duration.days === 0 || !duration.hasOwnProperty('days')) { formatDurationOpts['format'].push('hours') }
    if (duration.hours === 0 || !duration.hasOwnProperty('hours')) { formatDurationOpts['format'].push('minutes') }
    if (duration.minutes === 0 || !duration.hasOwnProperty('minutes')) { formatDurationOpts['format'].push('seconds') }

    return `${formatDuration(duration, formatDurationOpts)} ago`
}

export async function getServerSideProps({ res }) {
    const {timingInfo, socials } = await getSocials(true)
    res.setHeader("Server-Timing", Object.keys(timingInfo).map(k => { return `${k};dur=${timingInfo[k]}` }).join(', '))
    return { props: {
        social: socials.filter((item, pos) => { return socials.indexOf(item) === pos}).map(e => {
            e.timestamp = e.date.toISOString()

            return {
                type: e.type,
                id: e.id,
                timestamp: e.timestamp,
                date: formatSocialItemDuration(e.date),
                data: e.data
            }})
        }}
}

export default function SocialsApp(props) {
        let { social } = props

        const formatTwitter = t => {
            const guid = t.data.guid[0].replace(/#.*/g, '').split('/').pop()
            return (
                <div style={{margin: '0.5em', overflowWrap: 'anywhere'}}>
                    {!t.data.retweet && <small style={{color: 'dimgray'}}>{t.date}</small>}
                    <blockquote dangerouslySetInnerHTML={{__html: t.data.description[0]}}>
                    </blockquote>
                    <small><a href={`https://twitter.com/irys_en/status/${guid}`}>{`https://twitter.com/irys_en/status/${guid}`}</a></small>
                </div>
            )
        }

        const formatLeddit = l => {
            const hasLink = (l.data.content[0]['_'].indexOf('submitted by &#32; <a href="https://old.reddit.com/user/IRySoWise"> /u/IRySoWise </a>') > -1)
            const permalink = l.data.link[0]['$'].href
            l.data.content[0]['_'] = l.data.content[0]['_'].replaceAll("<img src=\"", "<img loading=\"lazy\" src=\"");
            return (
                <div className={styles.reddit} style={{margin: '0.5em', overflowWrap: (hasLink) ? 'initial' : 'anywhere'}}>
                    <small style={{color: 'dimgray'}}>{l.date}</small>
                    <br /><strong>{l.data.title[0]}</strong>
                    <blockquote dangerouslySetInnerHTML={{__html: l.data.content[0]['_'] }}>
                    </blockquote>
                    {!hasLink && <small><a href={permalink}>{permalink}</a></small>}
                </div>
            )
        }

        const formatYouTubeCommunity = (y, i) => {
            const has_supas = y.data?.has_supas || false
            const has_supana = y.data?.has_supana || false
            return (
                <div style={{margin: '0.5em', overflowWrap: 'anywhere'}}>
                    <small style={{color: 'dimgray'}}>{y.date}</small>
                <blockquote>
                    {y.data.content.map(e => { return (e.url) ? <><a href={e.url}>{e.text}</a></> : <>{e.text}</>;})}
                    {y.data.video instanceof Object && y.data.attachmentType === 'VIDEO' && [<br key={`${y.data.id}${i}0`} />,<iframe loading="lazy" key={`${y.data.id}${i}1`} width="940" height="529" src={`https://www.youtube.com/embed/${y.data.video.id}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>]}
                    {y.data.choices instanceof Array && y.data.choices.length > 0 && y.data.attachmentType === 'POLL' &&
                    <ol>
                        {y.data.choices.map((choice,i) => (<li className={styles.radio_list} key={`${y.data.id}${i}2`}>{choice.text}</li>))}
                    </ol>}
                    {y.data.images instanceof Array && y.data.images.length > 0 && y.data.attachmentType === 'IMAGE' && y.data.images.map((img,i) => (
                    <span key={`${y.data.id}${i}3`}>
                        <br />
                        <img loading="lazy" src={img} />
                    </span>
                    ))}
                </blockquote>
                <small><a href={`${y.data.href}`}>{`${y.data.href}`}</a></small>
                {has_supas && <br />}
                {!has_supas && has_supana && <br />}
                {has_supas && y.data.video instanceof Object && typeof y.data.video?.id === 'string' && <>[<a target='_blank' rel='noreferrer' href={`${process.env.PUBLIC_HOST || ''}/supas/${y.data.video.id}.html`}>Supas</a>]</>}
                {has_supana && y.data.video instanceof Object && typeof y.data.video?.id === 'string' && <>&nbsp;[<a target='_blank' rel='noreferrer' href={`${process.env.PUBLIC_HOST || ''}/supas/supana_${y.data.video.id}.html`}>Supana</a>]</>}
                </div>
            )
        }

        const formatSocial = (s, i) => {
            switch (s.type) {
                case 'twitter':
                    return formatTwitter(s)
                case 'reddit':
                    return formatLeddit(s)
                case 'youtube':
                    return formatYouTubeCommunity(s, i)
            }
        }

        let [newStateDOM, setNewStateDOM] = useState([])
        let [newState, setNewState] = useState([])
        newState = newState.filter(e => {
            const index = social.findIndex(j => { return e.id === j.id })
            return index === -1
        })
        let [interval, setIntervalState] = useState(null)
        if (interval === null) {
            setIntervalState(setInterval(async function() {
                try {
                    let stateEl = (newState instanceof Array && newState.length > 0) ? newState[0] : social[0]
                    let ids = []
                    let states = [newState, social]
                    for (let state of states) {
                        let timestampA = new Date(stateEl.timestamp)
                        let timestampB
                        state = state.filter(el => {
                            timestampB = new Date(el.timestamp)
                            return Date.parse(timestampA) === Date.parse(timestampB)
                        })
                        state.forEach(el => {
                            ids.push(el.id)
                        })
                    }
                    let date = new Date(stateEl.timestamp)
                    let fetchReq
                    const fetchEndpoint = `${process.env.PUBLIC_HOST || ''}/api/social`
                    for (let i = 0; i < 3; i++) {
                        try {
                            fetchReq = await fetch(fetchEndpoint, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({
                                    date: date.toISOString(),
                                    id: ids.join('|')
                                })
                            })
                            if (fetchReq.status < 400) { break; }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    if (fetchReq.status !== 200) { return; }
                    let json = await fetchReq.json()
                    if (json instanceof Array && json.length > 0) {
                        json = json.map(e => {
                            const date = new Date(e.date)
                            e.timestamp = date.toISOString()
                            e.date = formatSocialItemDuration(date)
                            return e
                        })
                        let _newState = Array.from([...json, ...newState])
                        _newState = _newState.filter((item, pos) => { return _newState.indexOf(item) === pos})
                        setNewState(_newState)
                        newState = _newState
                        setNewStateDOM(Array.from(_newState).map((s, i) => (
                            <div key={s.id} className={styles.socialItem}>{formatSocial(s, i)}</div>
                        )))
                    }
                } catch (e) { console.error(e) }
            }, (1000*60)*2) + (((Math.random()*100)%5)*1000))
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
                <Link className="font-bold no-underline" href="/social">IRySocial</Link>
            </section>
            <section className={styles.socialContainer}>
            {newStateDOM}
            {social.filter((e,i) => { return i === social.findIndex(f => f.id === e.id)}).map((s, i) => (
                <div key={s.id} className={styles.socialItem}>{formatSocial(s, i)}</div>
            ))}
            </section>
        </div>
    </div>
}
