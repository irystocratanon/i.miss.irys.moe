import styles from '../styles/Home.module.css'
import Head from "next/head"
import { STREAM_STATUS } from "../server/livestream_poller"
import getResult from "../server/poller.js"
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"
import { useEffect, useState } from "react"
import { intervalToDuration, parseISO } from "date-fns"
import { CountdownTimer } from "../components/countdown-timer"

function selectRandomImage(fromSet, excludingImage) {
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

    if (process.env.NODE_ENV === 'production') {
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
    let className, caption = "", favicon, imageSet, bottomInfo
    const [image, setImage] = useState(props.initialImage)
    let [liveReload,setLiveReload] = useState()
    try {
        if (liveReload === undefined) {
            const __liveReload = localStorage.getItem('livereload')
            let initialLiveReloadState = true
            try {
                let connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
                let connectionType = connection.type || null;
                initialLiveReloadState = (connectionType === 'cellular') ? false : initialLiveReloadState
            } catch(e) {}
            setLiveReload((__liveReload === null) ? initialLiveReloadState : Boolean(Number(__liveReload)))
        }
    } catch(e) {}

    if (props.isError) {
        className = "error"
        imageSet = ERROR_IMAGE_SET
        bottomInfo = <div className="stream-info">
            <p>There was a problem checking stream status. <a href={props.channelLink}>You can check IRyS&apos;s channel yourself</a>!</p>
        </div>
    } else if (props.status != STREAM_STATUS.LIVE && props.status != STREAM_STATUS.STARTING_SOON) {
        className = "miss-her"
        imageSet = NO_STREAM_IMAGE_SET
        bottomInfo = <StreamInfo status={props.status} info={props.streamInfo} />
        favicon = (Math.floor((Math.random()*10)%2)) ? 'Byerys.png' : 'Byerys2.png'
    } else {
        className = "comfy" 
        caption = "I Don't Miss IRyS"
        imageSet = HAVE_STREAM_IMAGE_SET
        bottomInfo = <StreamInfo status={props.status} info={props.streamInfo} />
        favicon = 'Hirys.png'
    }

    const liveReloadHook = () => {
        const _liveReload = Boolean(!liveReload)
        try {
            localStorage.setItem('livereload', Number(_liveReload))
        } catch (e) {}
        return setLiveReload(_liveReload)
    }

    useEffect(() => {
        const initialUpdateInterval = 60
        let updateInterval
        let timeout = null
        const synchroniseUpdateInterval = function(oldState = null) {
            let updateInterval
            let newState = (oldState !== null) ? Number(oldState) : null
            if ((props.pastStream !== null || props.streamInfo !== null) && props.status !== STREAM_STATUS.LIVE && props.status !== STREAM_STATUS.JUST_ENDED) {
                try {
                    const startDate = (props.streamInfo?.startTime !== null) ? Date.now() : parseISO(props.pastStream.end_actual)
                    const endDate = (props.streamInfo?.startTime !== null) ? props.streamInfo?.startTime : Date.now()
                    const d = intervalToDuration({
                        start: startDate,
                        end: endDate
                    });
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
        const interval = setInterval(() => {
            const liveReload = document.getElementById('livereload').checked
            const liveReloadProgress = document.getElementById('livereloadProgressCtr').firstChild
            if (!liveReload) {
                liveReloadProgress.style.width = "100%"
                updateInterval = null
                return () => clearInterval(interval)
            }
            if (updateInterval === null) {
                updateInterval = synchroniseUpdateInterval()
            }
            liveReloadProgress.style.transition = 'width 1s'
            updateInterval = synchroniseUpdateInterval(updateInterval)
            updateInterval = (updateInterval < 1) ? initialUpdateInterval : updateInterval
            let percent = (updateInterval-1)/initialUpdateInterval
            percent = (isNaN(percent)) ? 1 : percent
            liveReloadProgress.style.width = `${percent*100}%`
            if (updateInterval !== 1) {
                return
            }
            clearTimeout(timeout)
            timeout = setTimeout(async function() {
                fetch(`${window.location.protocol}//${window.location.hostname}${(window.location.port !== "80" && window.location.port !== "443") ? `:${window.location.port}` : ''}/api/status`).then(async function(res) {
                    const json = await res.json()
                    const title = (props.streamInfo.title !== null) ? props.streamInfo.title : props.pastStream.title
                    if (json.live !== props.status || json.title !== title) {
                        clearInterval(interval)
                        console.log(`props.status: ${props.status} title: ${title}`)
                        console.log(`json.live: ${json.live} title: ${json.title}`)
                        return window.location.reload()
                    }
                })
            }, (((Math.random()*100)%5)*1000))
            updateInterval = initialUpdateInterval
            liveReloadProgress.style.width = "100%"
        }, 1000);
        return () => {
            clearInterval(interval)
            updateInterval = null
            const liveReloadProgress = document.getElementById('livereloadProgressCtr').firstChild
            liveReloadProgress.style.width = "100%"
        }
    }, []);

    const validStream = isStreamInfoValid(props.streamInfo)

    return <div className={styles.site}>
        <Head>
            <title>I MISS IRyS</title>
            <link rel="shortcut icon" href={`/${favicon}`} />
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content={createEmbedDescription(props.status, props.streamInfo)} property="og:description" />
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>

        <div className={className}>
            <h1>{caption}</h1>

            {(!validStream || props.status !== STREAM_STATUS.LIVE) &&
            <img src={`${props.absolutePrefix}/${image}`} alt="wah" onClick={() => setImage(selectRandomImage(imageSet, image))} />
            }
            {validStream && props.status === STREAM_STATUS.LIVE &&
            <iframe width="940" height="529" src={props.streamInfo.link.replace(/\/watch\?v\=/, '/embed/')} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            }

            {bottomInfo}
            <CountdownTimer status={props.status} nextStream={props.streamInfo} pastStream={props.pastStream} />

            <footer>
                <a href={props.channelLink}>IRyS Ch. hololive-EN</a> <br />
                <small>
                    Not affiliated with IRyS or hololive - <a href="https://github.com/irystocratanon/i.miss.irys.moe">Source</a>
                </small>
            </footer>
        </div>
        <div style={{width: 100, position: "absolute", top: 10, left: 10}}>
            <input id="livereload" type="checkbox" checked={liveReload} onChange={() => {}} onClick={liveReloadHook} /><label htmlFor="livereload">live reload</label>
        </div>
        <div id="livereloadProgressCtr" style={{position: "fixed", bottom: 0, left: 0, width: "100%"}}>
            <div style={{background: "#a91354", width: "100%", height: "0.25em"}}>&nbsp;</div>
        </div>
    </div>
}
