import styles from '../styles/Home.module.css'
import Head from "next/head"
import { STREAM_STATUS } from "../server/livestream_poller"
import getResult from "../server/poller.js"
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"
import { useEffect, useState } from "react"
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
        },
        liveReload: true
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
    let [liveReload,setLiveReload] = useState(props.liveReload)

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
        liveReload = Boolean(!liveReload)
        return setLiveReload(liveReload)
    }

    useEffect(() => {
        const initialUpdateInterval = 60
        let updateInterval = initialUpdateInterval
        const interval = setInterval(() => {
            const liveReload = Boolean(document.getElementById('livereload').checked)
            const liveReloadLabel = document.getElementById('livereload').nextElementSibling
            if (!liveReload) {
                return () => clearInterval(interval);
            }
            liveReloadLabel.innerText = `live reload (${updateInterval})`
            updateInterval -= 1
            if (updateInterval === 1) {
                setTimeout(async function() {
                    console.log('update state!')
                    fetch(`${window.location.protocol}//${window.location.hostname}${(window.location.port !== "80" && window.location.port !== "443") ? `:${window.location.port}` : ''}/api/status`).then(async function(res) {
                        const json = await res.json()
                        const title = (props.pastStream !== null) ? props.pastStream.title : props.streamInfo.title
                        if (json.live !== props.status || json.title !== title) {
                            clearInterval(interval)
                            return window.location.reload()
                        }
                    })
                }, 1000)
                updateInterval = initialUpdateInterval
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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
            <img src={`${props.absolutePrefix}/${image}`} alt="wah" onClick={() => setImage(selectRandomImage(imageSet, image))} />

            {bottomInfo}
            <CountdownTimer status={props.status} nextStream={props.streamInfo} pastStream={props.pastStream} />

            <footer>
                <a href={props.channelLink}>IRyS Ch. hololive-EN</a> <br />
                <small>
                    Not affiliated with IRyS or hololive - <a href="https://github.com/irystocratanon/i.miss.irys.moe">Source</a>
                </small>
            </footer>
        </div>
        <div style={{border: "black 1px solid", width: 100, position: "absolute", bottom: 10, right: 10}}>
            <input id="livereload" type="checkbox" defaultChecked checked={liveReload} onClick={liveReloadHook} /><label htmlFor="livereload">live reload</label>
        </div>
    </div>
}
