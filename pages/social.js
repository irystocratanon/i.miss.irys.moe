import Head from "next/head"
import Link from "next/link"
import React from 'react'

import {getSocials} from '../pages/api/social.js'
import styles from '../styles/Social.module.css'

export async function getServerSideProps({ res }) {
    const social = await getSocials()
    return { props: { social: social.map(e => { return {type: e.type, data: e.data} }) } }
}

export default function SocialsApp(props) {
        let { social } = props

        const formatTwitter = t => {
            const guid = t.data.guid[0].replace(/#.*/g, '').split('/').pop()
            return (
                <div style={{margin: '0.5em'}}>
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
                <div style={{margin: '0.5em'}}>
                    <strong>{l.data.title[0]}</strong>
                    <blockquote dangerouslySetInnerHTML={{__html: l.data.content[0]['_'] }}>
                    </blockquote>
                    {!hasLink && <small><a href={permalink}>{permalink}</a></small>}
                </div>
            )
        }

        const formatSocial = s => {
            return (s.type === 'twitter') ? formatTwitter(s) : formatLeddit(s)
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
            {social.map((s, i) => (
                <div key={i} className={styles.socialItem}>{formatSocial(s)}</div>
             ))}
        </div>
    </div>
}
