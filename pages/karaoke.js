import Head from "next/head"
import Link from "next/link"
import React from 'react'
import styles from '../styles/Karaoke.module.css'
import KaraokeData from "../server/karaoke_data"

function songUrl(k, s) {
    return `https://www.youtube.com/watch?v=${k.videoId}&t=${s.timestamp}`
}

function search(kws, s) {
    kws = kws.toLowerCase().split(/\s+/);
    var ts = s.toLowerCase().split(/\s+/);
    return ts.reduce((r, t) => r && kws.reduce((r, kw) => r || kw.indexOf(t) === 0, false), true);
}
  

export default class KaraokeApp extends React.Component {

  static getInitialProps({query}) {
    return {query}
  }

  constructor(props) {
    super(props);

    this.state = {searchText: props.query.s || ''};
    
    this.lastSearchText = 'andkjanskdjnaskjdnakjs'
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ searchText: event.target.value });  
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  render() {

    let { karaoke, songs } = KaraokeData;
    let { searchText } = this.state;
    let list = karaoke.list;
    var searchResults = [];

    if(searchText && searchText.length && searchText != this.lastSearchText) {
        searchResults = songs.filter(s => search(s.keywords, searchText));
    } else {
        searchResults = [];
    }

    list = list.sort((a,b) => { return Date.parse(a.date) < Date.parse(b.date) || -1 });

    this.lastSearchText = searchText;

    const formatDate = (d) => {
        return d.toString().split(' ').filter((e,i) => { return !(i < 1 || i > 3) }).map((e,i) => { return (i == 1) ? `${e},` : e }).join(' ')
    }

    const formatDateId = (d) => {
        const year = d.getFullYear()
        const month = (d.getMonth()+1 < 10) ? `0${d.getMonth()+1}` : d.getMonth()+1
        const day = (d.getDate() < 10) ? `0${d.getDate()}` : d.getDate()
        return `${year}-${month}-${day}`
    }

    return <div className={styles.site}>
        <Head>
            <title>Karaoke</title>
            <link rel="shortcut icon" href="/Sing.png" />
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content="IRyS Karaoke" property="og:description" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        <section style={{display: 'flex', flexDirection: 'column-reverse', "margin": '10px'}}>
            <Link href="/">I miss her&hellip;</Link>
            &nbsp;|&nbsp;
            <Link href="/milestones">Milestones</Link>
            &nbsp;|&nbsp;
            <Link href="/karaoke">Karaoke</Link>
            &nbsp;|&nbsp;
            <Link href="/social">IRySocial</Link>

        </section>
        
            <section className={styles.search}>
            <h3>Find Archived Karaoke Song</h3>
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
                        <th colSpan="3">Search Results</th>
                        </tr>
                    </thead>
                    <tbody>
                    {searchResults.map((s, i) => (
                        <tr key={i}>
                            <td>{i+1}.</td>
                            {s.dead 
                            && <td className={styles.deadlink}>{s.title} - {s.artist}</td>
                            || <td><a href={songUrl(s.karaoke, s)} target="_blank" rel="noreferrer">{s.title} - {s.artist}</a></td>}
                            <td>{formatDate(s.karaoke.date)} -{s.karaoke.title}</td>

                        </tr>
                    ))}
            </tbody>
                </table>

            </section>
            <section className={styles.catalog}>
                <h3>Archived Karaoke Catalog</h3>
                
                {list.map(k => (
                <table width="100%" key={k.videoId}>
                <colgroup>
                    <col width="40px" />
                    <col/>
                </colgroup>
                    <tbody>
                    
                        <tr id={formatDateId(k.date)}>
                            <td className={styles.titlerow} style={{borderRight: 'none'}} colSpan="2">{formatDate(k.date)} -{k.title}</td>
                            <td className={styles.titlerow} style={{borderLeft: 'none'}}><a style={{display: 'flex', justifyContent: 'right', textAlign: 'right'}} href={`#${formatDateId(k.date)}`}>#</a></td>
                        </tr>
                        {k.songs.map((s, i) => (
                            <tr key={i}>
                                <td>{i+1}.</td>
                                {s.dead 
                                && <td style={{borderRight: 'none'}} className={styles.deadlink}>{s.title}{s.artist.length > 0 ? ' - ' : ''}{s.artist}</td>
                                || <td style={{borderRight: 'none'}}><a href={songUrl(k, s)} target="_blank" rel="noreferrer">{s.title}{s.artist.length > 0 ? ' - ' : ''}{s.artist}</a></td>}
                                <td style={{borderLeft: 'none'}}>&nbsp;</td>

                            </tr>
                        ))}
                    
            </tbody>
                </table>
                ))}
            </section>
        
        
    </div>
  }
}
