import KaraokeData from "../../server/karaoke_data"

export default function Home(props) {}

// https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
Home.getInitialProps = async function ({ res }) {
    let {songs} = KaraokeData;
    songs = songs.filter(e => { return !e.hasOwnProperty('dead') });
    let rep

    rep = songs[Math.floor(Math.random()*songs.length)]
    rep = `https://www.youtube.com/watch?v=${rep.karaoke.videoId}&t=${rep.timestamp}`

    if (res) {
        res.writeHead(302, {
            Location: rep
        });
        res.end();
    }
    return {};
}
