import styles from '../styles/Home.module.css'
import Head from "next/head"
import Link from "next/link"
import { STREAM_STATUS } from "../server/livestream_poller"
import getResult from "../server/poller.js"
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"
import { useEffect, useState, useRef } from "react"
import { intervalToDuration, parseISO } from "date-fns"
import { CountdownTimer } from "../components/countdown-timer"
import irysartPoller from "../server/irysart_poller"
import schedulePoller from "../server/schedule_poller"

function selectRandomImage(fromSet, excludingImage) {
    if (!fromSet) {
        return (excludingImage) ? excludingImage : ''
    }
    let excludeIndex
    if (excludingImage && fromSet.length > 1 && (excludeIndex = fromSet.indexOf(excludingImage)) > -1) {
        // This is to prevent the same image from being selected again.
        const nextIndex = (Math.random() * (fromSet.length - 1)) | 0
        return fromSet[nextIndex >= excludeIndex ? nextIndex + 1 : nextIndex]
    }

    return fromSet[(Math.random() * fromSet.length) | 0]
}

export async function getServerSideProps({ req, res, query }) {
    const absolutePrefix = process.env.PUBLIC_HOST
    const channelLink = `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`

    const {error,result,pastStream} = await getResult()

    if ((process.env.VERCEL_ENV || process.env.NODE_ENV || 'development') === 'production') {
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
    }

    if (error) {
        console.warn("livestream poll returned error:", error)
        return { props: { isError: true, absolutePrefix, initialImage: selectRandomImage(ERROR_IMAGE_SET), channelLink } }
    }

    let initialImage
    if (result.live != STREAM_STATUS.LIVE && result.live != STREAM_STATUS.STARTING_SOON) {
        initialImage = selectRandomImage(NO_STREAM_IMAGE_SET)
    } else {
        initialImage = selectRandomImage(HAVE_STREAM_IMAGE_SET)
    }

    return { props: {
        absolutePrefix,
        initialImage,
        channelLink,
        status: result.live,
        isError: false,
        pastStream: pastStream||null,
        streamInfo: {
            link: result.videoLink,
            title: result.title,
            startTime: result.streamStartTime?.getTime() || null,
            currentTime: (new Date()).getTime()
        }
    } }
}

function isStreamInfoValid(streamInfo) {
    return !!(streamInfo?.link)
}

function createEmbedDescription(status, streamInfo) {
    if (!isStreamInfoValid(streamInfo)) {
        return ""
    }

    switch (status) {
        case STREAM_STATUS.LIVE:
            return `Streaming: ${streamInfo.title}`
        case STREAM_STATUS.STARTING_SOON:
            return `Starting Soon: ${streamInfo.title}`
        case STREAM_STATUS.JUST_ENDED:
            return `Just Ended: ${streamInfo.title}`
        default:
            return `Next Stream: ${streamInfo.title}`
    }
}

function StreamInfo(props) {
    let link, text
    if (isStreamInfoValid(props.info)) {
        switch (props.status) {
            case STREAM_STATUS.LIVE:
                text = <b className={styles.red}>LIVE: </b>
                break
            case STREAM_STATUS.STARTING_SOON:
                text = "Starting Soon: "
                break
            case STREAM_STATUS.JUST_ENDED:
                text = "Just Ended: "
                break
            default:
                text = "Next Stream: "
                break
        }

        link = <b><a href={props.info.link}>{props.info.title}</a></b>
    } else {
        text = "Current Stream: "
        link = <><b>NOTHING</b> <small>(but maybe there&apos;s a member stream...)</small></>
    }

    return <div className="stream-info">
        <p>{text} {link}</p>
    </div>
}

export default function Home(props) {
    let className, caption = "", imageSet, bottomInfo
    const [image, setImage] = useState(props.initialImage)
    const currentImage = useRef()
    let [favicon, setFavicon] = useState()
    let [liveReload, setLiveReload] = useState()
    let [irysart, setIrysart] = useState()
    let [irysartSet, setIrysartSet] = useState()
    const [scheduleImg, setScheduleImg] = useState()
    const scheduleRef = useRef()
    const irysartRef = useRef()
    const liveReloadRef = useRef()

    let initialLiveReloadState = true
    initialLiveReloadState = (props.status === STREAM_STATUS.LIVE) ? false : initialLiveReloadState

    try {
        if (liveReload === undefined) {
            const __liveReload = localStorage.getItem('livereload')
            try {
                let connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
                let connectionType = connection.type || null;
                initialLiveReloadState = (connectionType === 'cellular') ? false : initialLiveReloadState
            } catch(e) {}
            setLiveReload((__liveReload === null) ? initialLiveReloadState : Boolean(Number(__liveReload)))
        }
    } catch(e) {
        if (liveReload === undefined) {
            setLiveReload(initialLiveReloadState)
        }
    }

    if (irysart === undefined) {
        try {
            const __irysart = localStorage.getItem('irysart')
            setIrysart((props.status === STREAM_STATUS.LIVE) ? false : Boolean(Number(__irysart)))
        } catch (e) {}
    }

    if (props.isError) {
        className = "error"
        imageSet = ERROR_IMAGE_SET
        bottomInfo = <div className="stream-info">
            <p>There was a problem checking stream status. <a href={props.channelLink}>You can check IRyS&apos;s channel yourself</a>!</p>
        </div>
        } else if ((props.status != STREAM_STATUS.LIVE && props.status != STREAM_STATUS.STARTING_SOON) || (props.streamInfo && props.streamInfo.startTime >= 0 && props.streamInfo.currentTime >= 0 && ((props.streamInfo.startTime - props.streamInfo.currentTime) / ((3600*24)*1000) >= 1))) {
        className = "miss-her"
        imageSet = NO_STREAM_IMAGE_SET
        bottomInfo = <StreamInfo status={props.status} info={props.streamInfo} />
        favicon || setFavicon((Math.floor((Math.random()*10)%2)) ? 'Byerys.png' : 'Byerys2.png')
    } else {
        className = "comfy" 
        caption = "I Don't Miss IRyS"
        imageSet = HAVE_STREAM_IMAGE_SET
        bottomInfo = <StreamInfo status={props.status} info={props.streamInfo} />
        favicon || setFavicon('Hirys.png')
    }

    if (irysart) {
        if (!irysartSet) {
            irysartPoller({image, scheduleRef, scheduleImg}, setIrysartSet)
        } else {
            if (image.startsWith('imagesets/')) {
                imageSet = irysartSet
                setImage(imageSet[0], image)
            }
        }
        imageSet = irysartSet
    } else {
        if (image.startsWith('//nitter.irys.moe') && (!scheduleRef?.current?.checked && image !== scheduleImg)) {
            setImage(imageSet[0], image)
        }
    }

    const scheduleHook = (updateImage = false) => {
        if (!scheduleRef?.current?.checked) {
            return
        }
        schedulePoller(function(schedule) {
            const oldSchedule = String(scheduleImg)
            const newSchedule = String(schedule[0])
            setScheduleImg(newSchedule)
            if (currentImage?.current?.src === oldSchedule || (oldSchedule.startsWith('//') && oldSchedule !== newSchedule) || updateImage === true) {
                setImage(newSchedule, newSchedule)
            }
        })
    }

    const irysartHook = () => {
        const _irysart = Boolean(irysartRef.current.checked)
        try {
            localStorage.setItem('irysart', Number(_irysart))
        } catch (e) {}
        setIrysart(_irysart)
    }

    const liveReloadHook = () => {
        const _liveReload = Boolean(liveReloadRef.current.checked)
        try {
            localStorage.setItem('livereload', Number(_liveReload))
        } catch (e) {}
        return setLiveReload(_liveReload)
    }

    let [intervalDuration,_setIntervalDuration] = useState()

    const setIntervalDuration = (start = null, end = null) => {
        try {
            if (props.status === STREAM_STATUS.LIVE) {
                _setIntervalDuration({})
                return {}
            }
            if (!props.streamInfo?.startTime && !props.pastStream?.end_actual) {
                _setIntervalDuration({})
                return {}
            }
            const currentDate = Date.now()

            if (start === null) {
                start = (props.streamInfo?.startTime !== null) ? currentDate : parseISO(props.pastStream?.end_actual)
            }
            if (end === null) {
                end = (props.streamInfo?.startTime !== null) ? props.streamInfo?.startTime : currentDate
            }

            if (!start && !end) {
                _setIntervalDuration({})
                return {}
            }

            start = (start instanceof String || typeof start === 'string') ? parseISO(start) : start
            end = (end instanceof String || typeof end === 'string') ? parseISO(end) : end
            const d = intervalToDuration({start, end})
            _setIntervalDuration(Object(d))
            return d
        } catch (e) { console.debug('[setIntervalDuration ERROR]'); console.error(e); return {}; }
    }
    if (intervalDuration === undefined) {
        setIntervalDuration()
    }

    useEffect(() => {
        const initialUpdateInterval = 60
        let updateInterval
        let timeout = null
        const initialTargetRefreshTime = 1
        let targetRefreshTime = initialTargetRefreshTime
        const synchroniseUpdateInterval = function(oldState = null) {
            targetRefreshTime = initialTargetRefreshTime
            let updateInterval
            let newState = (oldState !== null) ? Number(oldState) : null
            if ((props.pastStream !== null || props.streamInfo !== null) && props.status !== STREAM_STATUS.LIVE && props.status !== STREAM_STATUS.JUST_ENDED) {
                try {
                    const currentDate = Date.now()
                    const startDate = (props.streamInfo?.startTime !== null) ? currentDate : parseISO(props.pastStream.end_actual)
                    const endDate = (props.streamInfo?.startTime !== null) ? props.streamInfo?.startTime : currentDate

                    const d = setIntervalDuration()

                    if (endDate > currentDate) {
                        targetRefreshTime = initialUpdateInterval-1
                    }

                    // this makes sure we refresh on 0 seconds remaining
                    // (note: we may not actually refresh if the server cache lags behind)
                    const targetTimeMet =  Object.keys(d).filter(e => { return d[e] != 0 })
                    if (targetTimeMet.length === 0 || (targetTimeMet.length === 1 && targetTimeMet[0] === 'seconds' && d['seconds'] === 1)) {
                        updateInterval = initialUpdateInterval
                        targetRefreshTime = updateInterval
                        newState = updateInterval
                        return newState
                    }

                    updateInterval = (d.seconds > 0 && d.seconds <= initialUpdateInterval) ? initialUpdateInterval - d.seconds : ((newState !== null) ? newState - 1 : initialUpdateInterval)
                    newState = updateInterval
                } catch (e) {
                    console.warn(e)
                    updateInterval = initialUpdateInterval
                    newState = (newState !== null) ? newState-1 : updateInterval
                }
            } else {
                updateInterval = initialUpdateInterval
                newState = (newState !== null) ? newState-1 : updateInterval
            }
            return newState
        }
        updateInterval = synchroniseUpdateInterval()

        const liveReloadProgress = document.getElementById('livereloadProgressCtr').firstChild

        const defaultTransition = 'width 1s'
        const animateLiveReloadProgressToCompletion = () => {
            liveReloadProgress.style.transition = defaultTransition
            switch (targetRefreshTime) {
                case 1:
                    liveReloadProgress.style.width = "100%"
                    break
                default:
                    // transition smoothly from 100% to 0%
                    liveReloadProgress.style.transition = 'width 0.90s'
                    liveReloadProgress.style.width = "100%"
                    liveReloadProgress.style.transition = 'visibility 0.05s'
                    liveReloadProgress.style.visibility = "hidden"
                    liveReloadProgress.style.visibility = "visible"
                    break
            }
            liveReloadProgress.style.transition = defaultTransition
        }

        const interval = setInterval(() => {
            const endLiveReload = () => {
                liveReloadProgress.style.width = (targetRefreshTime === 1) ? "100%" : "0%"
                updateInterval = null
                synchroniseUpdateInterval()
                return
            }
            try {
                // can throw when exiting from home -> another page
                // using the back/forward button
                if (!liveReloadRef.current.checked) {
                    endLiveReload()
                    return
                }
            } catch (e) {
                endLiveReload()
                return
            }
            if (updateInterval === null) {
                updateInterval = synchroniseUpdateInterval()
            }
            liveReloadProgress.style.transition = defaultTransition
            updateInterval = synchroniseUpdateInterval(updateInterval)
            updateInterval = (updateInterval < 1) ? initialUpdateInterval : updateInterval
            let percent = (updateInterval-1)/initialUpdateInterval
            percent = (isNaN(percent)) ? 1 : percent
            liveReloadProgress.style.width = `${percent*100}%`
            if (updateInterval !== targetRefreshTime) {
                return
            }
            clearTimeout(timeout)
            timeout = setTimeout(async function() {
                const controller = new AbortController()
                let abortTimeout = setTimeout(() => { return controller.abort() }, 30*1000)
                await fetch(`${window.location.protocol}//${window.location.hostname}${(window.location.port !== "80" && window.location.port !== "443") ? `:${window.location.port}` : ''}/api/status`, {signal: controller.signal}).then(async function(res) {
                    if (res.status !== 200) {
                        return
                    }
                    const json = await res.json()
                    if (!json.hasOwnProperty('live') || !json.hasOwnProperty('title')) {
                        return
                    }
                    const title = (props.streamInfo.title !== null) ? props.streamInfo.title : (props.pastStream?.title || null)
                    if (json.live !== props.status || json.title !== title) {
                        clearInterval(interval)
                        return window.location.reload(true)
                    }
                    if (scheduleRef?.current?.checked) {
                        scheduleHook()
                    }
                    if (irysartRef?.current?.checked) {
                        irysartPoller({image, irysartSet, scheduleRef, scheduleImg}, setIrysartSet)
                    }
                }).catch((err) => { if (err.name !== 'AbortError') { console.error(err); } })
                clearTimeout(abortTimeout)
            }, (((Math.random()*100)%5)*1000))
            updateInterval = initialUpdateInterval
            animateLiveReloadProgressToCompletion()
        }, 1000);
        return () => {
            updateInterval = null
            animateLiveReloadProgressToCompletion()
        }
    }, []);

    const validStream = isStreamInfoValid(props.streamInfo)

    let imageSetPreload = []
    if (imageSet && imageSet instanceof Array && imageSet.length > 0) {
        for (let i = 0; i < imageSet.length; i++) {
            let _image = imageSet[i]
            imageSetPreload.push(<img key={i} decoding='async' src={`${(_image.startsWith("//")) ? 'https:' : props.absolutePrefix + "/"}${_image}`} />)
        }
    }

    let preloadSupas = (validStream && props.streamInfo.link.indexOf('www.youtube.com') > -1) ? `/supas/${props.streamInfo.link.split('?v=').pop()}.html` : null
    if (!preloadSupas) {
        if (props.pastStream?.id) {
            preloadSupas = `/supas/${props.pastStream.id}.html`
        }
    }

    const supas_js_pre_version = '0.5'
    const supas_js_version = '2.2'
    const supas_css_version = '1'


    return <div className={styles.site}>
        <Head>
            <title>I MISS IRyS</title>
            <link rel="shortcut icon" href={`/${favicon}`} />
            {preloadSupas &&
            <>
            <link rel="prefetch" href={preloadSupas} />
            <link rel="prefetch" href={`/supas.pre.min.js?v=${supas_js_pre_version}`} />
            <link rel="prefetch" href={`/supas.min.js?v=${supas_js_version}`} />
            <link rel="prefetch" href={`/supas.min.css?v=${supas_css_version}`} />
            </>
            }
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content={createEmbedDescription(props.status, props.streamInfo)} property="og:description" />
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        <div style={{display: "block", position: "absolute", top: 10, left: 10}}>
            <input id="livereload" type="checkbox" checked={liveReload} ref={liveReloadRef} onChange={() => {}} onClick={liveReloadHook} /><label htmlFor="livereload">live reload</label>
        </div>
        <section style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <Link href="/milestones">Milestones</Link>
            &nbsp;|&nbsp;
            <Link href="/karaoke">Karaoke</Link>
            &nbsp;|&nbsp;
            <Link href="/social">IRySocial</Link>
        </section>
        <div style={{display: "block", position: "absolute", top: 10, right: 10}}>
            <input id="schedule" type="checkbox" ref={scheduleRef} onChange={() => {}} onClick={() => scheduleHook(true)} /><label htmlFor="schedule">Schedule&nbsp;</label>
            <input id="irysart" type="checkbox" checked={irysart} ref={irysartRef} onChange={() => {}} onClick={irysartHook} /><label htmlFor="irysart">#IRySart&nbsp;</label>
        </div>
        <div className={className}>
            <h1>{caption}</h1>

            {(!validStream || props.status !== STREAM_STATUS.LIVE) &&
            <img ref={currentImage} src={`${(image.startsWith("//")) ? 'https:' : props.absolutePrefix + "/"}${image}`} alt="wah" onClick={() => setImage(selectRandomImage(imageSet, image))} />
            }
            <div id="imageSetPreload" style={{display: 'none', visibility: 'hidden'}}>
                {imageSetPreload}
            </div>
            {validStream && props.status === STREAM_STATUS.LIVE && props.streamInfo.link.indexOf('www.youtube.com') > -1 && 
            <iframe width="940" height="529" src={props.streamInfo.link.replace(/\/watch\?v\=/, '/embed/')} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            }
            {validStream && props.status === STREAM_STATUS.LIVE && props.streamInfo.link.indexOf('www.youtube.com') > -1 && 
            <p style={{textAlign: 'center'}}>[<a target='_blank' rel='noreferrer' href={`/supas/${props.streamInfo.link.split('?v=').pop()}.html`}>Supas</a>]</p>
            }

            {bottomInfo}
            <CountdownTimer status={props.status} intervalDuration={intervalDuration} nextStream={props.streamInfo} pastStream={props.pastStream} />

            <footer>
                <a href={props.channelLink}>IRyS Ch. hololive-EN</a> <br />
                <small>
                    Not affiliated with IRyS or hololive - <a href="https://github.com/irystocratanon/i.miss.irys.moe">Source</a>
                </small>
            </footer>
        </div>
        <div id="livereloadProgressCtr" style={{position: "fixed", bottom: 0, left: 0, width: `${((liveReloadRef && liveReloadRef.current) ? liveReloadRef.current.checked : true) ? "100%" : "0%"}`}}>
            <div style={{background: "#a91354", width: "100%", height: "0.25em"}}>&nbsp;</div>
        </div>
    </div>
}
