import KaraokeData from "../server/karaoke_data"
export default function Home(props) {}

Home.getInitialProps = async function ({ res }) {
    let {songs} = KaraokeData;
    songs = songs.filter(e => { return !e.hasOwnProperty('dead') });

    let m3u8 = `#EXTM3U`;

    for (let i = 0; i < songs.length; i++) {
        m3u8 += `

#EXTINF:-1,${songs[i].title}
https://www.youtube.com/watch?v=${songs[i].karaoke.videoId}&t=${songs[i].timestamp}`
    }

    res.writeHead(200, {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "s-maxage=1, stale-while-revalidate"
    });
    res.end(m3u8);

    return {};
}
