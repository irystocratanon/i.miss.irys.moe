import styles from '../styles/Home.module.css'
import Head from "next/head"
import { STREAM_STATUS, pollLivestreamStatus, pollLivestreamStatusDummy } from "../server/livestream_poller"
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"
import { useState } from "react"
import { getPastStream, CountdownTimer } from "../components/countdown-timer.js"
import {pollCollabstreamStatus} from "../server/collabs_poller.js"
import {intervalToDuration,parseISO} from "date-fns"

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
    let apiVal
	let pastStream
	let collabs
    if (process.env.USE_DUMMY_DATA === "true") {
        apiVal = await pollLivestreamStatusDummy(process.env.WATCH_CHANNEL_ID, query.mock)
    } else {
        apiVal = await pollLivestreamStatus(process.env.WATCH_CHANNEL_ID)
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
	}

	let { result, error } = apiVal

	if (result.live !== STREAM_STATUS.LIVE) {
        pastStream = await getPastStream()
		collabs = await pollCollabstreamStatus(process.env.WATCH_CHANNEL_ID)
		switch (collabs.status) {
			case 'upcoming':
			case 'live':
				const collabStart = parseISO(collabs.start_scheduled)
				const streamEarlierThanCollab = (result.streamStartTime !== null) ? ((result.streamStartTime < collabStart)) : false
				if (!streamEarlierThanCollab) {
					let collabStatus = (collabs.status === 'upcoming') ? STREAM_STATUS.INDETERMINATE : STREAM_STATUS.LIVE
					const timeLeft = intervalToDuration({start: Date.now(), end: collabStart})
					collabStatus = (timeLeft.hours < 1 && (Date.now() < collabStart)) ? STREAM_STATUS.STARTING_SOON : collabStatus
					result = {
						live: collabStatus,
						title: collabs.title,
						videoLink: `https://www.youtube.com/watch?v=${collabs.id}`,
						streamStartTime: collabStart
					}
				}
				break;
			default:
				break;
		}
	}

    const absolutePrefix = process.env.PUBLIC_HOST
    const channelLink = `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`

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
    </div>
}
