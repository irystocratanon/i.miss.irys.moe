import Head from "next/head"
import Link from "next/link"
import React from 'react'
import styles from '../styles/Karaoke.module.css'
import {intervalToDuration,formatDuration} from "date-fns"

function search(kws, s) {
    if (!s.indexOf("【") >= 0) {
        kws = kws.replaceAll("【", "")
    }
    if (!s.indexOf("】") >= 0) {
        kws = kws.replaceAll("】", "")
    }
    kws = kws.toLowerCase().split(/\s+/);
    var ts = s.toLowerCase().split(/\s+/);
    return ts.reduce((r, t) => r && kws.reduce((r, kw) => r || kw.indexOf(t) === 0, false), true);
}
  
export async function getServerSideProps({ query, res }) {
    const lz4 = (await import('lz4'))
    //const req = await fetch("http://127.0.0.1:8000/archives.jsonl.lz4")
    const req = await fetch("https://github.com/irystocratanon/i.miss.irys.moe-supadata/blob/master/archives.jsonl.lz4?raw=true")
    const buf = await req.arrayBuffer()
    let channels = {}
    const queryIsRegex = query.s && query.s[0] === '/' && query.s.length > 1 && query.s[query.s.length-1] === '/'
    const r = (queryIsRegex) ? new RegExp(query.s.slice(1, query.s.length-1), "i") : null
    const archives = lz4.decode(Buffer.from(buf)).toString().split('\n').filter(e => e).map(e => JSON.parse(e)).sort((x, y) => {
        return new Date(x.startTime) < new Date(y.startTime) ? 1 : -1
    }).map(e => {
        const now = Date.now()
        const tDate = new Date(e.startTime)
        const hidden = Date.parse(tDate) > now+(((1000*3600)*24)*7);
        e.hidden = hidden
        return e
    }).filter((e, i, arr) => {
        const {channelId, channelName} = arr[i]
        if (!channels.hasOwnProperty(channelId)) {
            channels[channelId] = channelName
        }
        if (query.channel) {
            return query.channel.toLowerCase() === 'all' || e.channelId === query.channel
        } else {
            return e.channelId === 'UC8rcEBzJSleTkf_-agPM20g'
        }
    }).filter(e => {
        return !query.s || (queryIsRegex && r.test(query.s)) || e.title.toLowerCase().indexOf(query.s.toLowerCase()) > -1
    }).slice(0, 1024*4.5)
    channels = Object.keys(channels).sort((a,b) => channels[a].localeCompare(channels[b])).reduce((acc,key) => { acc[key] = channels[key]; return acc; }, {});
    return {props: {
        archives,
        channels,
        query: {
            s: query.s || null,
            channel: query.channel || null,
            month: query.month || null
        }
    }}
}

export default class ArchivesApp extends React.Component {

  constructor(props) {
    super(props);

    this.archives = props.archives
    this.channels = props.channels

    this.state = {searchText: props.query.s || '', selectedMonth: props.query.month || '', selectedChannel: props.query.channel || 'UC8rcEBzJSleTkf_-agPM20g', searchResults: [] };
    
    this.lastSearchText = 'andkjanskdjnaskjdnakjs'
    this.handleChange = this.handleChange.bind(this);
    this.handleChannelChange = this.handleChannelChange.bind(this);
    this.handleMonthChange = this.handleMonthChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.updateLocation = this.updateLocation.bind(this);
  }

  updateLocation(newState = {}, reload = true) {
      let { searchText, selectedMonth, selectedChannel } = this.state
      searchText = (newState.hasOwnProperty('searchText')) ? newState['searchText'] : searchText
      selectedMonth = (newState.hasOwnProperty('selectedMonth')) ? newState['selectedMonth'] : selectedMonth
      selectedChannel = (newState.hasOwnProperty('selectedChannel')) ? newState['selectedChannel'] : selectedChannel
      let search = ''
      let token = "?"
      if (location.pathname === "/archives" && (window.location.search.indexOf("channel=") > -1 || selectedChannel != 'UC8rcEBzJSleTkf_-agPM20g')) {
          search += token + "channel=" + selectedChannel
      }
      if (selectedMonth) {
          token = (search.length > 0) ? '&' : '?'
          search += token + "month=" + selectedMonth
      }
      if (searchText) {
          token = (search.length > 0) ? '&' : '?'
          search += token + "s=" + searchText
      }
      if (reload) {
          window.location.search = search
      } else {
          let updateState = true
          if (newState.hasOwnProperty("selectedMonth")) {
              updateState = (((newState["selectedMonth"].match(/[0-9]+-[0-9][0-9]?/) && ! newState["selectedMonth"].match(/[0-9]+-0$/)) || newState["selectedMonth"].length === 0)) ? true : false
          }
          if (updateState) {
              let url = new URL(window.location.protocol + '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443 ? ':' + window.location.port : '')) + window.location.pathname + search)
              history.replaceState({}, "", url);
          }
      }
  }

  handleMonthChange(event) {
      const newState = { selectedMonth: event.target.value }
      this.setState(newState)
      this.updateLocation(newState, false)
  }

  handleChannelChange(event) {
      const newState = { selectedChannel: event.target.value }
      this.setState(newState)
      this.updateLocation(newState)
  }

  handleChange(event) {
      const newState = { searchText: event.target.value }
      this.setState(newState)
      this.updateLocation(newState, false)
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  render() {
    let { searchResults, selectedChannel, selectedMonth, searchText } = this.state;
    let archives = this.archives
    const channels = this.channels

    if(searchText && searchText.length && searchText != this.lastSearchText) {
        if (searchText[0] === '/' && searchText.length > 1 && searchText[searchText.length-1] === '/') {
            const r = new RegExp(searchText.slice(1, searchText.length-1), "i")
            searchResults = archives.filter(s => { return r.test(s.title) })
        } else {
            searchResults = archives.filter(s => { return search(s.title, searchText) });
        }
    }
    // eslint-disable-next-line react/no-direct-mutation-state
    this.state.searchResults = (searchText.length < 1) ? [] : searchResults

    this.lastSearchText = searchText;
    this.lastMonth = selectedMonth

    let isFutureMonth = false
    let isFutureYear = false
    let selectedMonthYear
    let selectedMonthMonth
    if (selectedMonth.length > 0) {
        let selectedMonthDate = new Date(selectedMonth)
        const currentYear = (new Date()).getFullYear()
        const currentMonth = (new Date()).getUTCMonth()+1
        selectedMonthYear = selectedMonthDate.getFullYear()
        selectedMonthMonth = selectedMonthDate.getUTCMonth()+1
        isFutureYear = (selectedMonthYear) > currentYear
        isFutureMonth = (selectedMonthYear === currentYear && selectedMonthMonth > currentMonth) || isFutureYear
    }

    const currentDate = new Date();
    function formatDurationText(d) {
        d = (d instanceof Date) ? d : new Date(d)
        const duration = intervalToDuration({start: currentDate, end: d})
        let formatDurationOpts = {format: ['years']}
        if (duration.years === 0 || !duration.hasOwnProperty('years')) { formatDurationOpts['format'].push('months') }
        if (duration.months === 0 || !duration.hasOwnProperty('months')) { formatDurationOpts['format'].push('weeks') }
        if (duration.weeks === 0 || !duration.hasOwnProperty('weeks')) { formatDurationOpts['format'].push('days') }
        if (duration.days === 0 || !duration.hasOwnProperty('days')) { formatDurationOpts['format'].push('hours') }
        if (duration.hours === 0 || !duration.hasOwnProperty('hours')) { formatDurationOpts['format'].push('minutes') }
        if (duration.minutes === 0 || !duration.hasOwnProperty('minutes')) { formatDurationOpts['format'].push('seconds') }
        return (currentDate < d) ? d.toLocaleString() : `${formatDuration(duration, formatDurationOpts)} ago`
      }
      let archivedList = archives.filter(k => {
          return (selectedChannel != "all") ? k.channelId === selectedChannel : true
      }).filter(k => {
          return (isFutureMonth || isFutureYear) ? true : !k.hidden
      }).filter(k => {
          if (selectedMonth.length < 1) { return true; }
          const d = new Date(k.startTime)
          return selectedMonthMonth === d.getUTCMonth()+1 && selectedMonthYear === d.getFullYear()
      }).map(k => {
          const duration = formatDurationText(k.startTime);
          return (
        <table width="100%" key={k.videoId}>
            <colgroup>
                <col width="40px" />
                <col/>
            </colgroup>
            <tbody>
                <tr>
                    <td className={styles.titlerow} style={{borderRight: 'none'}} colSpan="2"><span title={(new Date(k.startTime)).toLocaleString()}>{duration}</span><br/><a style={{display: 'inline-flex', flexDirection: 'column'}} href={`https://www.youtube.com/watch?v=${k.videoId}`}>{k.title}<img src={`https://i3.ytimg.com/vi/${k.videoId}/hqdefault.jpg`} loading="lazy" decoding="async" /></a><br/>{k.supas > 0 && <>[<a href={`/supas/${k.videoId}.html`}>Supas({k.supas})</a>]</>}{k.supana > 0 && <>&nbsp;[<a href={`/supas/supana_${k.videoId}.html`}>Supana({k.supana})</a>]</>}</td>
                </tr>
            </tbody>
        </table>
        )
    })

    return <div className={styles.site}>
        <Head>
            <title>Archives</title>
            <link rel="shortcut icon" href="/Sing.webp" />
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content="IRyS Archives" property="og:description" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        <section style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <Link href="/">I miss her&hellip;</Link>
            &nbsp;|&nbsp;
            <Link className="font-bold no-underline" href="/archives">Archives</Link>
            &nbsp;|&nbsp;
            <Link href="/milestones">Milestones</Link>
            &nbsp;|&nbsp;
            <Link href="/karaoke">Karaoke</Link>
            &nbsp;|&nbsp;
            <Link href="/social">IRySocial</Link>

        </section>
        
            <section className={styles.search}>
                <h3>Find Archived Streams</h3>
                <form onSubmit={this.handleSubmit}>
                <select value={this.state.selectedChannel} selected={this.state.selectedChannel} onChange={this.handleChannelChange}>
                    <option value="all">All</option>
                    {Object.keys(channels).map(k => {
                        return <option key={k} value={`${k}`}>{channels[k]}</option>
                    })}
                </select>
                <input value={this.state.selectedMonth} onChange={this.handleMonthChange} style={{width: "10em", marginLeft: "1em", marginBottom: "1em"}} title="filter month" placeholder={`year-month (${(new Date()).getFullYear()}-${(new Date()).getMonth()+1})`} type="month"></input>
            </form>
                <form onSubmit={this.handleSubmit}>        
                    <input placeholder="Search..." type="text" value={this.state.searchText} onChange={this.handleChange} />
                </form>

                <table width="100%">
                <colgroup>
                    <col width="40px" />
                    <col/>
                    <col/>
                </colgroup>
                    <thead>
                        <tr>
                        <th colSpan="6">Search Results</th>
                        </tr>
                    </thead>
                    <tbody>
                    {searchResults.map((s, i) => (
                        <tr key={i}>
                            <td>{i+1}.</td>
                            <td><a href={`https://www.youtube.com/watch?v=${s.videoId}`} target="_blank" rel="noreferrer">{s.title}</a></td>
                            <td>{(new Date(s.startTime)).toLocaleString()} {currentDate > new Date(s.startTime) && <>(<strong>{formatDurationText(s.startTime)}</strong>)</>}</td>
                            <td><a href={`https://www.youtube.com/channel/${s.channelId}`} target="_blank" rel="noreferrer">{s.channelName}</a></td>
                            <td>{s.supas > 0 && <a href={`/supas/${s.videoId}.html`}>Supas({s.supas})</a> || <>Supas(0)</>}</td>
                            <td>{s.supana > 0 && <a href={`/supas/supana_${s.videoId}.html`}>Supana({s.supana})</a> || <>Supana(0)</>}</td>
                        </tr>
                    ))}
            </tbody>
                </table>

            </section>
            <section className={styles.catalog}>
                {archivedList.length > 0 && searchResults.length === 0 && <h3>Archived Streams</h3>}
                
                {searchResults.length === 0 && archivedList}
            </section>
        
        
    </div>
  }
}
