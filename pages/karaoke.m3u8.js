import KaraokeData from "../server/karaoke_data"
export default function Home(props) {}

Home.getInitialProps = async function ({ res }) {
    const {list} = KaraokeData.karaoke

    let m3u8 = `#EXTM3U`;

    list.reverse().forEach(el => {
        let {songs} = el
        songs = songs.filter(e => { return !e.hasOwnProperty('dead') });
        for (let i = 0; i < songs.length; i++) {
            m3u8 += `

#EXTINF:-1,${songs[i].title}
https://www.youtube.com/watch?v=${el.videoId}&t=${songs[i].timestamp}`
        }
    })

    res.writeHead(200, {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "s-maxage=1, stale-while-revalidate"
    });
    res.end(m3u8);

    return {};
}
