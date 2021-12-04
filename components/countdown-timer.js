import Script from "next/script"
import { Component } from "react"
import { pollPaststreamStatus, pollPaststreamStatusDummy } from "../server/paststream_poller"
import { STREAM_STATUS } from "../server/livestream_poller"
import { intervalToDuration, parseISO } from "date-fns"

export async function getPastStream() {
    let pastStream 
    if (process.env.USE_DUMMY_DATA === "true") {
        pastStream = await pollPaststreamStatusDummy(process.env.WATCH_CHANNEL_ID)
	} else {
		pastStream = await pollPaststreamStatus(process.env.WATCH_CHANNEL_ID)
    }

    return pastStream
}

export class CountdownTimer extends Component {
    constructor(props) {
        super(props)
        this.state = {label: '', status: props.status, nextStream: props.nextStream, pastStream: props.pastStream}
    }

    componentDidMount() {
        this.timerID = setInterval(() => this.tick(), 500)
    }

    componentWillUnmount() {
        clearInterval(this.timerID)
    }

    formatLabel() {
        const descriptor = (this.state.nextStream?.startTime) ? 'until' : 'without'
        try {
            const startDate = (descriptor === 'until') ? Date.now() : parseISO(this.state.pastStream.end_actual)
            const endDate = (descriptor === 'until') ? this.state.nextStream.startTime : Date.now()
            if (descriptor === 'until' && startDate >= (endDate-900)) { return "Waiting for IRyS…"; }
            const d = intervalToDuration({
                start: startDate,
                end: endDate
            });
            return Object.keys(d).filter(k => { return d[k] > 0 }).map((k, i) => {
                return ((i > 0) ? ((k !== 'seconds') ? ', ' : ' and ') : '') + `${d[k]} ` + ((d[k] < 2) ? k.substr(0, k.length-1) : k)
            }).join('') + ` ${descriptor} IRyS`
        } catch (e) { return ''; }
    }

    tick() {
        this.setState({
            label: this.formatLabel()
        })
    }

    render() {
        if ((this.state.status !== STREAM_STATUS.OFFLINE && !this.state.nextStream?.startTime) || this.state.status === STREAM_STATUS.LIVE) { this.componentWillUnmount(); return <></> }
        return (
            <>
            {this.state.label}
            </>
        )
    }
}
