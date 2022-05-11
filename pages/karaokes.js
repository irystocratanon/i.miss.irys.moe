import Head from "next/head"
import React from 'react';
import styles from '../styles/Karaokes.module.css'
import KaraokeData from "../server/karaoke_data"

function songUrl(k, s) {
    return `https://www.youtube.com/watch?v=${k.videoId}&t=${s.timestamp}`
}

function search(kws, s) {
    kws = kws.toLowerCase().split(/\s+/);
    var ts = s.toLowerCase().split(/\s+/);
    return ts.reduce((r, t) => r && kws.reduce((r, kw) => r || kw.indexOf(t) === 0, false), true);
  }
  

export default class KaraokesApp extends React.Component {

  constructor(props) {
    super(props);
    this.state = {searchText: ''};
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

    let { karaokes, songs } = KaraokeData;
    let { searchText } = this.state;
    let list = karaokes.list;
    var searchResults = [];

    if(searchText && searchText.length && searchText != this.lastSearchText) {
        searchResults = songs.filter(s => search(s.keywords, searchText));
    } else {
        searchResults = [];
    }

    this.lastSearchText = searchText;

    return <div className={styles.site}>
        <Head>
            <title>Karaokes</title>
            <link rel="shortcut icon" href="/Woah.png" />
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#ffbafb" />
            <meta content="I MISS IRyS" property="og:title" />
            <meta content="IRyS Karaokes" property="og:description" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        
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
                            <td>{s.karaoke.date} -{s.karaoke.title}</td>
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
                            <td className={styles.titlerow} colSpan="2">{k.date} -{k.title}</td>
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
