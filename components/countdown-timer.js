import { Component } from "react"
import { STREAM_STATUS } from "../server/livestream_poller"
import { parseISO } from "date-fns"

export class CountdownTimer extends Component {
    constructor(props) {
        super(props)
        this.state = {
            label: '',
            status: props.status,
            nextStream: props.nextStream,
            pastStream: props.pastStream,
            intervalDuration: props.intervalDuration
        }
        this.state.label = this.formatLabel()
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
            if (!this.state.pastStream?.end_actual && !this.state.nextStream?.startTime) {
                return ''
            }
            if (descriptor === 'until' && !this.state.nextStream?.startTime) {
                return ''
            }
            const startDate = (descriptor === 'until') ? Date.now() : parseISO(this.state.pastStream?.end_actual)
            const endDate = (descriptor === 'until') ? this.state.nextStream?.startTime : Date.now()
            if (descriptor === 'until' && startDate >= (endDate-900)) { return "Waiting for IRyS…"; }
            const d = Object(this.props.intervalDuration)
            if (!d.hasOwnProperty('seconds')) {
                return ''
            }
            if (d.years === 0 && d.months === 0 && d.days === 0 && d.hours === 0 && d.minutes === 0 && d.seconds === 0) {
                return ''
            }
            return Object.keys(d).filter(k => { return d[k] > 0 }).map((k, i) => {
                return ((i > 0) ? ((k !== 'seconds') ? ', ' : ' and ') : '') + `${d[k]} ` + ((d[k] < 2) ? k.substr(0, k.length-1) : k)
            }).join('') + ` ${descriptor} IRyS`
        } catch (e) { console.error(e); return ''; }
    }

    tick() {
        this.setState({
            label: this.formatLabel()
        })
    }

    render() {
        if ((this.state.status !== STREAM_STATUS.OFFLINE && !this.state.nextStream?.startTime) || this.state.status === STREAM_STATUS.LIVE || this.state.status === STREAM_STATUS.JUST_ENDED || (this.state.nextStream?.startTime === null && this.state.pastStream === null)) { this.componentWillUnmount(); return <></> }
        let videoLink = (this.state.pastStream?.videoLink) ? this.state.pastStream.videoLink : `https://www.youtube.com/watch?v=${this.state.pastStream.id}`
        videoLink = (!this.state.nextStream?.startTime) ? videoLink : (this.state.nextStream.videoLink || this.state.nextStream.link || `https://www.youtube.com/watch?v=${this.state.nextStream.id}`
)
        let supasLink
        if (videoLink && videoLink.indexOf('youtu.be') > -1 || videoLink.indexOf('youtube.com') > -1) {
            supasLink = videoLink.split('?v=').pop()
            supasLink = (supasLink?.length > 0) ? supasLink : null
        }
        return <>
            {this.state.label}
            <p>{!this.state.nextStream?.startTime ? <span>(time since <a href={videoLink}>{this.state.pastStream.title.trimLeft()}</a>)</span> : null}</p>
            {supasLink ? <p style={{textAlign: 'center'}}>[<a target='_blank' rel='noreferrer' href={`/supas/${supasLink}.html`}>Supas</a>]</p> : <></>}
            </>
    }
}
