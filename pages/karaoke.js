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
            <a href={`${process.env.PUBLIC_HOST || ''}/milestones`}>Milestones</a>
            &nbsp;|&nbsp;
            <Link href="/karaoke">Karaoke</Link>
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
                            <td><a href={songUrl(s.karaoke, s)} target="_blank" rel="noreferrer">{s.title} - {s.artist}</a></td>
                            <td>{s.karaoke.date.toString().split(' ').map((e,i) => { if (i < 1 || i > 3) { return; } if (i == 2) { return `${e},`; } return e }).filter(e => { return (e) ? e : false }).join(' ')} -{s.karaoke.title}</td>
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
                    
                        <tr>
                            <td className={styles.titlerow} colSpan="2">{k.date.toString().split(' ').map((e,i) => { if (i < 1 || i > 3) { return; } if (i == 2) { return `${e},`; } return e }).filter(e => { return (e) ? e : false }).join(' ')} -{k.title}</td>
                        </tr>
                        {k.songs.map((s, i) => (
                            <tr key={i}>
                                <td>{i+1}.</td>
                                <td><a href={songUrl(k, s)} target="_blank" rel="noreferrer">{s.title} - {s.artist}</a></td>
                            </tr>
                        ))}
                    
            </tbody>
                </table>
                ))}
            </section>
        
        
    </div>
  }
}
