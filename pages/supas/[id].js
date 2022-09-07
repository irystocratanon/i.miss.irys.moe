export default function Home(props) {}

Home.getInitialProps = async function ({ req, res, query }) {
    if (!res || !query || !query?.id || query?.id.endsWith('.html') === false) {
        res.writeHead(404);
        res.end()
    }
    if (res) {
        try {
            const supaReq = await fetch(`${process.env.SUPAS_ENDPOINT}/${query.id}`)
            res.writeHead(supaReq.status, { "Content-Type": "text/html" });
            res.end(await supaReq.text());
        } catch (err) {
            console.error(err)
            res.writeHead(500);
            res.end();
        }
    }
}
