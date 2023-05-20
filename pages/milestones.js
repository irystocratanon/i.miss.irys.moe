import Head from "next/head"
import Link from "next/link"
import React from 'react'
import { useEffect, useState } from "react"
import styles from '../styles/Milestones.module.css'
import '../node_modules/animate.css/animate.min.css'
import { milestoneDelta } from "../server/milestone"
import getReps from "../server/reps_poller"

class ViewsNumberFormat extends React.Component {
    constructor(props) {
        super(props);
        this.viewsElementRef = React.createRef();
        this.animating = false;
        this.state = {
            value: props.value,
            nextValue: -1
        }
    }

    // this will be called when it receive props
    UNSAFE_componentWillReceiveProps(nextProps) {
        if (this.state.value <= nextProps.value) {
            return
        }
        console.log('this.props.value: ', this.props.value, 'this.state.value', this.state.value, 'nextProps.value: ', nextProps.value);
        this.animating = true;
        this.viewsElementRef.current.className=' animate__animated animate__flipOutX';
        this.setState({value: this.props.value, nextValue: nextProps.value})
    }

    shouldComponentUpdate() {
        return this.state.value != this.state.nextValue && this.state.nextValue < this.state.value
    }

    render() {
        const animationEnd = el => {
            if (this.animating) {
                el.target.className='hidden';
                this.animating = false;
                const nextState = this.state.nextValue;
                el.target.innerHTML = nextState.toLocaleString()
                el.target.className = el.target.className.replace('hidden', 'animate__animated animate__flipInX')
                this.setState({value: nextState, nextValue: nextState});
            } else {
                el.target.className = "";
            }
        };
        return <span ref={this.viewsElementRef} onAnimationEnd={animationEnd} className={`${this.props.className||''}`}>{this.state.value.toLocaleString()}</span>
    }
}

class NumberFormat extends React.Component {
    render() {
        return <span className={this.props.className}>{this.props.value.toLocaleString()}</span>
    }
}

function formatReps(_reps) {
    var closestMillion = 1_000_000;
    var closestMillionaire = null;
    const reps = Array.from(_reps)
        .map(rep => {
            if (typeof rep !== 'object') { return; }
            rep.milestone = milestoneDelta(rep.views || 0);
            if(rep.milestone.millionDelta < closestMillion) {
                closestMillion = rep.milestone.millionDelta
                closestMillionaire = rep;
            }
            return rep;
        }).sort((a, b) => a.milestone.delta - b.milestone.delta)
    return {closestMillionaire, reps}
}

export async function getServerSideProps({ res }) {
    const {closestMillionaire, reps} = formatReps(await getReps())

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
    
    let [topMillionaireState, setTopMillionaireState] = useState(JSON.parse(JSON.stringify(topMillionaire)))
    let [topState, setTopState] = useState(JSON.parse(JSON.stringify(top)))

    let [topicState, setTopicState] = useState(JSON.parse(JSON.stringify(topics)))
    let [nonTopicState, setNonTopicState] = useState(JSON.parse(JSON.stringify(nonTopics)))

    let [interval, setIntervalState] = useState(null)
    if (interval === null) {
        const updateMilestoneState = async function() {
            const topStateVideoId = topState?.videoId
            const topMillionaireId = topMillionaireState?.videoId
            let updatedState = false;
            try {
                const req = await fetch('/milestones.json');
                const reps = await req.json()
                const newTopState = (topStateVideoId) ? reps.find(e => e.videoId === topStateVideoId) : null
                const newTopMillionaireState = (topStateVideoId) ? reps.find(e => e.videoId === topStateVideoId) : null
                
                const milestones = formatReps(reps);
                const _top = milestones.reps[0]
                const _closestMillionaire = milestones.closestMillionaire

                const _topics = milestones.reps.filter(v => v.topic)
                const _nonTopics =  milestones.reps.filter(v => !v.topic)

                if (newTopState) {
                    //console.log(`newTopState: ${_top.videoId} ${topStateVideoId}`)
                    if (_top.videoId === topStateVideoId) {
                        //_top.milestone.delta = Math.floor(Math.random()*1000);
                        setTopState(JSON.parse(JSON.stringify(_top)))
                        updatedState = true;
                    }
                }

                if (newTopMillionaireState) {
                    if (_closestMillionaire && _closestMillionaire.videoId && _closestMillionaire.videoId === topMillionaireId) {
                        setTopMillionaireState(JSON.parse(JSON.stringify(_closestMillionaire)))
                        updatedState = true;
                    }
                }
                let topicsChanged = false; 
                if (_topics.length >= topicState.length && _topics.length >= 3) {
                    for (let i = 0; i < 3; i++) {
                        if (topicState[i].videoId !== _topics[i].videoId) {
                            topicsChanged = true;
                            break;
                        }
                    }
                    if (!topicsChanged) {
                        setTopicState(JSON.parse(JSON.stringify(_topics)))
                        updatedState = true
                    }
                }

                let nonTopicsChanged = false; 
                if (_nonTopics.length >= nonTopicState.length && _nonTopics.length >= 3) {
                    for (let i = 0; i < 3; i++) {
                        if (nonTopicState[i].videoId !== _nonTopics[i].videoId) {
                            nonTopicsChanged = true;
                            break;
                        }
                    }
                    if (!nonTopicsChanged) {
                        setNonTopicState(JSON.parse(JSON.stringify(_nonTopics)))
                        updatedState = true
                    }
                }
            } catch {}
            if (updatedState) {
                setIntervalState(setTimeout(updateMilestoneState, (4000 + Math.random()*10000%1100) + (Math.random()*100000%15000)))
            }
        }
        setIntervalState(setTimeout(updateMilestoneState, (4000 + Math.random()*10000%1100) + (Math.random()*100000%15000)))
    }

    return <div className={styles.site}>
        <Head>
            <title>Milestones</title>
            <link rel="shortcut icon" href="/Woah.webp" />
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content="IRyS Milestones" property="og:description" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        <section style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <Link href="/">I miss her&hellip;</Link>
                &nbsp;|&nbsp;
                <Link href="/archives">Archives</Link>
                &nbsp;|&nbsp;
                <Link className="font-bold no-underline" href="/milestones">Milestones</Link>
                &nbsp;|&nbsp;
                <Link href="/karaoke">Karaoke</Link>
                &nbsp;|&nbsp;
                <Link href="/social">IRySocial</Link>
        </section>
        <div>
            <section className={styles.top}>
                <a href="/reps" target="_blank" title="random"><button><span>🎲 </span></button></a>
            </section>

            {!topState.milestone.million && <section id={topMillionaireState.videoId} className={styles.top}>
                <h3>Next Millionaire</h3>
                <div><iframe className={"px-1 aspect-video"} src={topMillionaireState.url.replace(/\/watch\?v\=/, '/embed/')} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>
                <a href={topMillionaireState.url}>{topMillionaireState.title}</a>
                <div> is <ViewsNumberFormat value={topMillionaireState.milestone.millionDelta}></ViewsNumberFormat> views away from <NumberFormat className={styles.million} value={topMillionaireState.milestone.millionMilestone}></NumberFormat>!!</div>
            </section>}

            <section id={topState.videoId} className={styles.top}>
                <h3>Next Milestone</h3>
                <div><iframe className={"pr-1 aspect-video"} src={topState.url.replace(/\/watch\?v\=/, '/embed/')} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>
                <a href={topState.url}>{topState.title}</a>
                <div> is <ViewsNumberFormat value={topState.milestone.delta}></ViewsNumberFormat> views away from <NumberFormat className={topState.milestone.million ? styles.million : ''} value={topState.milestone.milestone}></NumberFormat>!!</div>
            </section>

            <section className={styles.milestones}>
            <section className={styles.mid}>
                <h3>Channel Milestones</h3>
                <table width="100%">
                    <tbody>
                        {nonTopicState.slice(0, 3).map((r) => (
                        <tr key={r.url}>
                            <td className={styles.titlecol}><a href={r.url}>{r.title}</a></td>
                            <td className={styles.numcol}><ViewsNumberFormat value={r.milestone.delta}/> away from <NumberFormat value={r.milestone.milestone}/>!!</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            <section className={styles.bottom}>
                <h3>Topic Channel Milestones</h3>
                <table width="100%">
                    <tbody>
                        {topicState.slice(0, 3).map((r) => (
                        <tr key={r.url}>
                            <td className={styles.titlecol}><a href={r.url}>{r.title}</a></td>
                            <td className={styles.numcol}><ViewsNumberFormat value={r.milestone.delta}/> away from <NumberFormat value={r.milestone.milestone}/>!!</td>
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
