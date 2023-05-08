import Head from "next/head"
import Link from "next/link"
import React from 'react'
import styles from '../styles/Karaoke.module.css'

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
    const archives = lz4.decode(Buffer.from(buf)).toString().split('\n').filter(e => e).map(e => JSON.parse(e)).sort((x, y) => {
        return new Date(x.startTime) < new Date(y.startTime) ? 1 : -1
    }).map(e => {
        const now = Date.now()
        const tDate = new Date(e.startTime)
        const hidden = Date.parse(tDate) > now+(((1000*3600)*24)*7);
        e.hidden = hidden
        return e
    }).filter(e => {
        if (query.channel) {
            return e.channelId === query.channel
        }
        return true
    })
    return {props: {
        archives,
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
    this.channels = {}
    for (let i = 0; i < this.archives.length; i++) {
        const {channelId, channelName} = this.archives[i];
        if (!this.channels.hasOwnProperty(channelId)) {
            this.channels[channelId] = channelName
        }
    }
    this.channels = Object.keys(this.channels).sort((a,b) => this.channels[a].localeCompare(this.channels[b])).reduce((acc,key) => { acc[key] = this.channels[key]; return acc; }, {});

    this.state = {searchText: props.query.s || '', selectedMonth: props.query.month || '', selectedChannel: props.query.channel || 'UC8rcEBzJSleTkf_-agPM20g' };
    
    this.lastSearchText = 'andkjanskdjnaskjdnakjs'
    this.handleChange = this.handleChange.bind(this);
    this.handleChannelChange = this.handleChannelChange.bind(this);
    this.handleMonthChange = this.handleMonthChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleMonthChange(event) {
      this.setState({ selectedMonth: event.target.value });
  }

  handleChannelChange(event) {
    this.setState({ selectedChannel: event.target.value });  
  }

  handleChannelChange(event) {
    this.setState({ selectedChannel: event.target.value });  
  }

  handleMonthChange(event) {
    this.setState({ selectedMonth: event.target.value });  
  }

  handleChange(event) {
    this.setState({ searchText: event.target.value });  
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  render() {
    let { selectedChannel, selectedMonth, searchText } = this.state;
    let archives = this.archives
    const channels = this.channels
    var searchResults = [];

    if(searchText && searchText.length && searchText != this.lastSearchText) {
        searchResults = archives.filter(s => { return search(s.title, searchText) });
    } else {
        searchResults = [];
    }

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

      let archivedList = archives.filter(k => {
          return (selectedChannel != "-1") ? k.channelId === selectedChannel : true
      }).filter(k => {
          return (isFutureMonth || isFutureYear) ? true : !k.hidden
      }).filter(k => {
          if (selectedMonth.length < 1) { return true; }
          const d = new Date(k.startTime)
          return selectedMonthMonth === d.getUTCMonth()+1 && selectedMonthYear === d.getFullYear()
      }).map(k => (
        <table width="100%" key={k.videoId}>
            <colgroup>
                <col width="40px" />
                <col/>
            </colgroup>
            <tbody>
                <tr>
                    <td className={styles.titlerow} style={{borderRight: 'none'}} colSpan="2">{(new Date(k.startTime)).toLocaleString()}<br/><a href={`https://www.youtube.com/watch?v=${k.videoId}`}>{k.title}<img src={`https://i3.ytimg.com/vi/${k.videoId}/hqdefault.jpg`} loading="lazy" decoding="async" /></a><br/>{k.supas > 0 && <>[<a href={`/supas/${k.videoId}.html`}>Supas({k.supas})</a>]</>}{k.supana > 0 && <>&nbsp;[<a href={`/supas/supana_${k.videoId}.html`}>Supana({k.supana})</a>]</>}</td>
                </tr>
            </tbody>
        </table>
        ))

    if (this.state.searchText.length === 0) {
        //archivedList = selectedMonth.length < 1 ? archivedList.slice(0, 116) : archivedList
    } else {
        archivedList = []
    }

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
                <select value={this.state.selectedChannel} selected={this.state.selectedChannel} onChange={this.handleChannelChange}>
                    <option value="-1">All</option>
                    {Object.keys(channels).map(k => {
                        return <option key={k} value={`${k}`}>{channels[k]}</option>
                    })}
                </select>
                <input value={this.state.selectedMonth} onChange={this.handleMonthChange} style={{width: "10em", marginLeft: "1em", marginBottom: "1em"}} title="filter month" placeholder={`year-month (${(new Date()).getFullYear()}-${(new Date()).getMonth()+1})`} type="month"></input>
                <form onSubmit={this.handleSubmit}>        
                    <input placeholder="Search..." type="text" value={this.state.searchText} onChange={this.handleChange} autoFocus={true} />
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
                            <td>{(new Date(s.startTime)).toLocaleString()}</td>
                            <td><a href={`https://www.youtube.com/channel/${s.channelId}`} target="_blank" rel="noreferrer">{s.channelName}</a></td>
                            <td>{s.supas > 0 && <a href={`/supas/${s.videoId}.html`}>Supas({s.supas})</a> || <>Supas(0)</>}</td>
                            <td>{s.supana > 0 && <a href={`/supas/supana_${s.videoId}.html`}>Supana({s.supana})</a> || <>Supana(0)</>}</td>
                        </tr>
                    ))}
            </tbody>
                </table>

            </section>
            <section className={styles.catalog}>
                {archivedList.length > 0 && <h3>Archived Streams</h3>}
                
                {archivedList}
            </section>
        
        
    </div>
  }
}
