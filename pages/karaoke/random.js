import KaraokeData from "../../server/karaoke_data"

export default function Home(props) {}

// https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
Home.getInitialProps = async function ({ query, res }) {
    let {songs} = KaraokeData;
    songs = songs.filter(e => { return !e.hasOwnProperty('dead') });
    if (!query.hasOwnProperty('members')) {
        songs = songs.filter(e => {
            const title = e.karaoke.title.toLowerCase()
            return title.indexOf('members only') === -1
        });
    }
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
