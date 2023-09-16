import Head from "next/head"
import Link from "next/link"
import Image from 'next/image'
import React from 'react'
import styles from '../styles/Karaoke.module.css'
import {closestIndexTo,intervalToDuration,formatDuration} from "date-fns"
import {CancelledStreams} from "../server/cancelled.js"
import { performance } from "perf_hooks"
import { ARCHIVES_CACHE, holoMap } from "../server/constants.js"

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
    let t0 = performance.now()
    let t1

    const now = Date.now()
    const lz4 = (await import('lz4'))

    let {exists, readFile, writeFile} = (await import('fs'))
    const {promisify} = (await import('util'))

    exists = promisify(exists)
    readFile = promisify(readFile)
    writeFile = promisify(writeFile)

    const t2 = performance.now()

    const controller = new AbortController()
    let abortTimeout

    let req
    let buf
    try {
        // Github goes brrrr
        abortTimeout = setTimeout(() => { controller.abort(); }, 7_500)
        req = await fetch("https://raw.githubusercontent.com/irystocratanon/i.miss.irys.moe-supadata/master/archives.jsonl.lz4", {signal: controller.signal})
        clearTimeout(abortTimeout)
        buf = await req.arrayBuffer()
    } catch (e) {
        console.error(e);
        req = null
    }
    const t3 = performance.now()

    console.debug(`[archives fetch] ${t3-t2}`);

    let channels = {}
    const sanitizeChannelUsernameSameCase = (c => c.replaceAll(' ', '').replaceAll("'", ''))
    const sanitizeChannelUsername = (c => c.toLowerCase().replaceAll(' ', '').replaceAll("'", ''))
    if (typeof query.channel === 'string' && query.channel.startsWith('@')) {
        query.channel = query.channel.slice(1)
        let key = Object.keys(holoMap).filter(k => sanitizeChannelUsername(holoMap[k]) === sanitizeChannelUsername(query.channel))
        if (key.length > 0) {
            const orig_channel = query.channel
            const new_channel = sanitizeChannelUsernameSameCase(holoMap[key[key.length-1]])
            if (orig_channel !== new_channel) {
                let query_string = ''
                if (query?.s) {
                    query_string += `?s=${query.s}`
                } else if (query?.month) {
                    query_string += `?month=${query.month}`
                }
                return {
                    redirect: {
                        destination: `/archives/@${new_channel}${query_string}`,
                        permanent: false
                    }
                }
            }
        }
        query.channel = (key.length > 0) ? key.pop() : query.channel
    }
    const queryIsRegex = query.s && query.s[0] === '/' && query.s.length > 1 && query.s[query.s.length-1] === '/'
    const r = (queryIsRegex) ? new RegExp(query.s.slice(1, query.s.length-1), "i") : null
    let WATCH_CHANNEL_USERNAME = null
    let _io = null
    if (req && req?.status < 400) {
        _io = writeFile(ARCHIVES_CACHE, Buffer.from(buf))
    } else {
        if (await exists(ARCHIVES_CACHE)) {
            buf = await readFile(ARCHIVES_CACHE)
        } else {
            req = await fetch("https://raw.githubusercontent.com/irystocratanon/i.miss.irys.moe-supadata/master/archives.jsonl.lz4")
            buf = await req.arrayBuffer()
        }
    }
    const archives = lz4.decode(Buffer.from(buf)).toString().split('\n').filter(e => e).map(e => JSON.parse(e)).sort((x, y) => {
        return new Date(x.startTime) < new Date(y.startTime) ? 1 : -1
    }).map(e => {
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
            WATCH_CHANNEL_USERNAME = holoMap[query.channel]
            WATCH_CHANNEL_USERNAME = (WATCH_CHANNEL_USERNAME) ? sanitizeChannelUsername(WATCH_CHANNEL_USERNAME) : WATCH_CHANNEL_USERNAME
            return query.channel.toLowerCase() === 'all' || e.channelId === query.channel ||  (query.channel.toLowerCase() !== 'all' && e?.mentions && e.mentions.findIndex(j => j === query.channel || WATCH_CHANNEL_USERNAME && j.toLowerCase() === WATCH_CHANNEL_USERNAME.toLowerCase()) > -1)
        } else {
            WATCH_CHANNEL_USERNAME='IRyS'
            return e.channelId === process.env.WATCH_CHANNEL_ID || (e?.mentions && e.mentions.findIndex(j => j === process.env.WATCH_CHANNEL_ID || j.toLowerCase() === WATCH_CHANNEL_USERNAME.toLowerCase()) > -1)
        }
    }).filter(e => {
        return !query.s || (queryIsRegex && r.test(query.s)) || e.title.toLowerCase().indexOf(query.s.toLowerCase()) > -1
    }).filter(e => {
        return (!query.channel || query.channel === process.env.WATCH_CHANNEL_ID) ? (CancelledStreams.indexOf(e.videoId) === -1) : e
    }).slice(0, 1024*4.5)
    channels = Object.keys(channels).sort((a,b) => channels[a].localeCompare(channels[b])).reduce((acc,key) => { acc[key] = channels[key]; return acc; }, {});
    
    const ret = {props: {
        now,
        WATCH_CHANNEL_ID: process.env.WATCH_CHANNEL_ID,
        WATCH_CHANNEL_USERNAME: WATCH_CHANNEL_USERNAME || null,
        holoMap,
        archives,
        channels,
        query: {
            s: query.s || null,
            channel: query.channel || null,
            month: query.month || null
        }
    }}
    t1 = performance.now();
    console.debug(`[archives getServerSideProps] ${t1-t0}`);
    if (_io) {
        await _io
    }
    if (req && req?.status < 400) {
        res.setHeader("Vercel-CDN-Cache-Control", "s-maxage=10, stale-while-revalidate=59")
    } else {
        res.setHeader("Vercel-CDN-Cache-Control", "s-maxage=1, stale-if-error=300")
    }
    return ret
}

export default class ArchivesApp extends React.Component {

  constructor(props) {
    super(props);

    this.archives = props.archives
    this.channels = props.channels

    this.state = {searchText: props.query.s || '', selectedMonth: props.query.month || '', now: props.now, WATCH_CHANNEL_USERNAME: props.WATCH_CHANNEL_USERNAME, holoMap: props.holoMap, WATCH_CHANNEL_ID: props.WATCH_CHANNEL_ID, selectedChannel: props.query.channel || props.WATCH_CHANNEL_ID, searchResults: [] };
    
    this.lastSearchText = 'andkjanskdjnaskjdnakjs'
    this.handleChange = this.handleChange.bind(this);
    this.handleChannelChange = this.handleChannelChange.bind(this);
    this.handleMonthChange = this.handleMonthChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.updateLocation = this.updateLocation.bind(this);
  }

  updateLocation(newState = {}, reload = true) {
      let { now, searchText, selectedMonth, selectedChannel, WATCH_CHANNEL_ID, holoMap, WATCH_CHANNEL_USERNAME } = this.state
      searchText = (newState.hasOwnProperty('searchText')) ? newState['searchText'] : searchText
      selectedMonth = (newState.hasOwnProperty('selectedMonth')) ? newState['selectedMonth'] : selectedMonth
      selectedChannel = (newState.hasOwnProperty('selectedChannel')) ? newState['selectedChannel'] : selectedChannel
      let search = ''
      let token = "?"
      let page = null
      if (location.pathname === "/archives" && (window.location.search.indexOf("channel=") > -1)) {
          search += token + "channel=" + selectedChannel
      } else {
          page = selectedChannel
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
          if (page) {
              page = (Object.hasOwn(holoMap, page)) ? holoMap[page].replaceAll("'", '').replaceAll(" ", '') : page
              const suf = (page.startsWith('UC') || page === 'all') ? '' : '@'
              window.location.pathname = `/archives/${suf}${page}`
          }
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

  handleArchivesReload(e) {
      e.preventDefault();
      if(window.location.pathname !== "/archives")
          window.location.pathname = "/archives";
  }

  handleSubmit(event) {
    event.preventDefault();
  }

    componentDidMount() {
        const firstNode = document.querySelector("table[data-closest]");
        const node = document.querySelector("table[data-closest=true]");
        if (node === firstNode) { return }
        if (!node) { return; }
        function isElementInViewport (el) {
            var rect = el.getBoundingClientRect();

            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
            );
        }
        if (!isElementInViewport(node)) {
            window.scrollTo({
                top: node.getBoundingClientRect().y,
                left: window.scrollX,
                behavior: 'instant',
            });
            if (node?.scrollIntoViewIfNeeded) {
                node.scrollIntoViewIfNeeded();
            } else {
                node.scrollIntoView();
            }
        }
  }

  render() {
    let { now, searchResults, selectedChannel, WATCH_CHANNEL_ID, WATCH_CHANNEL_USERNAME, selectedMonth, searchText } = this.state;
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
      const archivedList = archives.filter(k => {
          return (selectedChannel != "all") ? (k.channelId === selectedChannel || k?.mentions && k.mentions.findIndex(j => j === selectedChannel || WATCH_CHANNEL_USERNAME && j.toLowerCase() === WATCH_CHANNEL_USERNAME.toLowerCase()) > -1) : true
      }).filter(k => {
          return (isFutureMonth || isFutureYear) ? true : !k.hidden
      }).filter(k => {
          if (selectedMonth.length < 1) { return true; }
          const d = new Date(k.startTime)
          return selectedMonthMonth === d.getUTCMonth()+1 && selectedMonthYear === d.getFullYear()
      });

      let closestIndex = closestIndexTo(new Date(now), archivedList.map(e => new Date(e.startTime)))
      closestIndex = (closestIndex > 0) ? closestIndex-1 : closestIndex

      const archivedListNodes = archivedList.map((k, i) => {
          const duration = formatDurationText(k.startTime);
          const closest = (i === closestIndex)
          const img = {
              src: `https://i3.ytimg.com/vi/${k.videoId}/hqdefault.jpg`,
              loading: (closest || i === closestIndex+1) ? "eager" : "lazy",
              decoding: (closest || i === closestIndex+1) ? "sync" : "async"
          }
          let mentions = []
          if (k.mentions) {
              k.mentions.forEach(mention => {
                  if (mention.startsWith('UC') && mentions.indexOf(mention) === -1) {
                      mentions.push(mention)
                      return
                  } else {
                      Object.keys(holoMap).filter(key => {
                          const possible_mention = holoMap[key].toLowerCase();
                          return mention.toLowerCase() === possible_mention || possible_mention.replaceAll(" ", '').replaceAll("'", '') === mention.toLowerCase()
                      }).forEach(mention => {
                          if (mentions.indexOf(mention) === -1) {
                              mentions.push(mention)
                          }
                      })
                  }
              })
          }
          if (k?.channelId && mentions.indexOf(k.channelId) === -1) {
              mentions.push(k.channelId)
          }
          mentions = (mentions.length === 1) ? [] : mentions
          return (
        <table width="100%" data-closest={closest} key={k.videoId}>
            <colgroup>
                <col width="40px" />
                <col/>
            </colgroup>
            <tbody>
                <tr>
                    <td className={styles.titlerow} style={{borderRight: 'none'}} colSpan="2">
                        <span title={(new Date(k.startTime)).toLocaleString()}>{duration}</span>
                        <section>
                            {mentions.map((img,i) => <a key={img} href={`/archives/${img}`}><picture><img style={{display: 'inline-flex', width: 40, height: 40, marginLeft: (i > 0) ? '0.125em' : 'initial'}} title={holoMap[img]} className="rounded-[50%]" src={`/api/ytimg/${img}`} /></picture></a>)}
                        </section><a style={{display: 'inline-flex', flexDirection: 'column'}} href={`https://www.youtube.com/watch?v=${k.videoId}`}>{k.title}<img src={img.src} loading={img.loading} decoding={img.decoding} /></a><br/>{k.supas > 0 && <>[<a href={`/supas/${k.videoId}.html`}>Supas({k.supas})</a>]</>}{k.supana > 0 && <>&nbsp;[<a href={`/supas/supana_${k.videoId}.html`}>Supana({k.supana})</a>]</>}</td>
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
            <Link className="font-bold no-underline" href="/archives" onClick={this.handleArchivesReload}>Archives</Link>
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
                {archivedListNodes.length > 0 && searchResults.length === 0 && <h3>Archived Streams</h3>}
                
                {searchResults.length === 0 && archivedListNodes}
            </section>
        
        
    </div>
  }
}
